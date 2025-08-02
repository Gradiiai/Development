import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSessionWithAuth } from '@/auth';
import { getScoringParameters, createCandidateScore, updateCandidate } from '@/lib/database/queries/campaigns';
import { db } from '@/lib/database/connection';
import { candidates, candidateScores } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Fallback scoring function for when AI processing fails
function calculateFallbackScore(resumeData: any, parameter: any) {
  const parameterName = parameter.parameterName.toLowerCase();
  const parameterType = parameter.parameterType;
  let score = 0;
  let evidence = 'No specific evidence found';
  let reasoning = 'Fallback scoring based on keyword matching';
  let proficiencyFound = null;
  let matchQuality = 'Poor';

  try {
    const resumeText = JSON.stringify(resumeData).toLowerCase();
    
    if (parameterType === 'skill') {
      // Check for exact skill match
      if (resumeText.includes(parameterName)) {
        score = 60; // Base score for keyword match
        evidence = `Found "${parameter.parameterName}" mentioned in resume`;
        matchQuality = 'Good';
        proficiencyFound = 'Intermediate';
        
        // Look for experience indicators
        const experienceKeywords = ['years', 'experience', 'expert', 'advanced', 'senior', 'lead'];
        const hasExperience = experienceKeywords.some(keyword => resumeText.includes(keyword));
        if (hasExperience) {
          score += 15;
          proficiencyFound = 'Advanced';
        }
      } else {
        // Check for related technologies
        const relatedTerms = getRelatedTerms(parameterName);
        const foundRelated = relatedTerms.find(term => resumeText.includes(term.toLowerCase()));
        if (foundRelated) {
          score = 45;
          evidence = `Found related technology: ${foundRelated}`;
          matchQuality = 'Fair';
          proficiencyFound = 'Beginner';
        }
      }
    } else if (parameterType === 'competency') {
      // Basic competency scoring
      if (resumeText.includes(parameterName)) {
        score = 55;
        evidence = `Found "${parameter.parameterName}" mentioned in resume`;
        matchQuality = 'Good';
        proficiencyFound = 'Intermediate';
      }
    } else {
      // Generic scoring for other types
      if (resumeText.includes(parameterName)) {
        score = 50;
        evidence = `Found "${parameter.parameterName}" mentioned in resume`;
        matchQuality = 'Fair';
      }
    }
    
    // Ensure minimum score for any resume content
    if (score === 0 && resumeData && Object.keys(resumeData).length > 0) {
      score = 25; // Minimum score for having a resume
      evidence = 'Resume provided but no specific match found';
      reasoning = 'Base score for resume submission';
    }
    
  } catch (error) {
    console.error('Error in fallback scoring:', error);
    score = 20;
    evidence = 'Error in processing, default score applied';
    reasoning = 'Fallback score due to processing error';
  }

  return {
    score,
    evidence,
    reasoning,
    proficiencyFound,
    matchQuality
  };
}

// Helper function to get related terms for skills
function getRelatedTerms(skill: string): string[] {
  const relatedMap: { [key: string]: string[] } = {
    'nodejs': ['node.js', 'node', 'javascript', 'express', 'npm'],
    'react': ['reactjs', 'jsx', 'javascript', 'frontend', 'ui'],
    'python': ['django', 'flask', 'pandas', 'numpy', 'backend'],
    'java': ['spring', 'hibernate', 'maven', 'gradle', 'jvm'],
    'javascript': ['js', 'typescript', 'node', 'react', 'vue', 'angular'],
    'sql': ['mysql', 'postgresql', 'database', 'queries', 'rdbms'],
    'aws': ['amazon', 'cloud', 'ec2', 's3', 'lambda', 'devops'],
    'docker': ['container', 'kubernetes', 'devops', 'deployment'],
    'git': ['github', 'gitlab', 'version control', 'repository']
  };
  
  return relatedMap[skill.toLowerCase()] || [];
}

// Calculate and store talent fit scores for individual parameters
async function calculateAndStoreTalentFitScores(
  candidateId: string,
  campaignId: string,
  resumeData: any
): Promise<void> {
  try {
    // Clear existing scores for this candidate
    await db.delete(candidateScores).where(eq(candidateScores.candidateId, candidateId));
    
    // Get scoring parameters for this campaign
    const parametersResult = await getScoringParameters(campaignId);
    if (!parametersResult.success || !parametersResult.data || parametersResult.data.length === 0) {
      console.log('No scoring parameters found for campaign:', campaignId);
      // Set talent fit score to 0 if no parameters
      await updateCandidate(candidateId, { talentFitScore: 0 });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Process each scoring parameter
    for (const parameter of parametersResult.data) {
      try {
        console.log(`Calculating score for parameter: ${parameter.parameterName} (${parameter.parameterType})`);
        
        // Create a focused prompt for this specific parameter with enhanced scoring logic
        const parameterPrompt = `
You are an expert HR analyst. Analyze this resume data against the specific parameter and provide a detailed score.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Scoring Parameter:
- Type: ${parameter.parameterType}
- Name: ${parameter.parameterName}
- Required Proficiency: ${parameter.proficiencyLevel || 'Not specified'}
- Weight: ${parameter.weight}%
- Is Required: ${parameter.isRequired}
- Description: ${parameter.description || 'No description provided'}

Scoring Guidelines:
1. SKILLS: 
   - Exact match: 80-100 points
   - Related/similar technology: 60-79 points
   - Transferable skills: 40-59 points
   - No evidence: 0-39 points
   - Add 10-20 points for years of experience (1-2 years: +10, 3-5 years: +15, 5+ years: +20)

2. COMPETENCIES:
   - Clear demonstration with examples: 80-100 points
   - Some evidence in work history: 60-79 points
   - Implied through roles/responsibilities: 40-59 points
   - No evidence: 0-39 points

3. EXPERIENCE:
   - Perfect match (role, industry, years): 90-100 points
   - Good match (2/3 criteria): 70-89 points
   - Partial match (1/3 criteria): 50-69 points
   - No relevant experience: 0-49 points

4. EDUCATION:
   - Exact degree match: 85-100 points
   - Related field: 65-84 points
   - Transferable education: 45-64 points
   - No relevant education: 0-44 points

Proficiency Level Mapping:
- Expert: 5+ years, leadership roles, advanced projects
- Advanced: 3-5 years, complex projects, mentoring
- Intermediate: 1-3 years, independent work
- Beginner: <1 year, basic knowledge

IMPORTANT: Be generous but fair in scoring. Most candidates should score between 30-80 points unless they are exceptional (90-100) or completely unqualified (0-29).

Respond with ONLY valid JSON:
{
  "score": 75,
  "evidence": "Specific evidence from resume",
  "reasoning": "Detailed explanation",
  "proficiencyFound": "Beginner/Intermediate/Advanced/Expert or null",
  "matchQuality": "Excellent/Good/Fair/Poor"
}`;
        
        const result = await model.generateContent(parameterPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean and parse the JSON response with improved error handling
        let cleanedResponse = text.trim();
        
        // Remove markdown code blocks
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Handle cases where AI refuses to process or gives non-JSON responses
        if (cleanedResponse.toLowerCase().includes("i'm sorry") || 
            cleanedResponse.toLowerCase().includes("i cannot") ||
            cleanedResponse.toLowerCase().includes("unable to") ||
            !cleanedResponse.includes('{')) {
          console.log(`AI refused to process parameter ${parameter.parameterName}, using fallback score`);
          const fallbackScore = calculateFallbackScore(resumeData, parameter);
          cleanedResponse = JSON.stringify(fallbackScore);
        }
        
        // Clean up common JSON issues
        cleanedResponse = cleanedResponse
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape newlines in strings
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        
        // Try to extract JSON from the response if it's embedded in text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        let parameterScore;
        try {
          parameterScore = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error(`Failed to parse AI response for parameter ${parameter.parameterName}:`, parseError);
          console.error('Cleaned response that failed:', cleanedResponse.substring(0, 500));
          
          // Try to fix common JSON issues and parse again
          try {
            let fixedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
            parameterScore = JSON.parse(fixedResponse);
          } catch (secondParseError) {
            console.error(`Second parsing attempt failed for parameter ${parameter.parameterName}:`, secondParseError);
            // Use fallback scoring instead of default 0
            console.log(`Using fallback scoring for parameter ${parameter.parameterName}`);
            parameterScore = calculateFallbackScore(resumeData, parameter);
          }
        }
        
        // Ensure score is within valid range
        const finalScore = Math.max(0, Math.min(100, Number(parameterScore.score) || 0));
        
        // Store the score in the database
        const scoreData = {
          candidateId: candidateId,
          parameterId: parameter.id,
          score: finalScore,
          aiGenerated: true,
          notes: JSON.stringify({
            evidence: parameterScore.evidence,
            reasoning: parameterScore.reasoning,
            proficiencyFound: parameterScore.proficiencyFound,
            matchQuality: parameterScore.matchQuality,
            parameterWeight: parameter.weight,
            recalculated: true,
            recalculatedAt: new Date().toISOString()
          })
        };
        
        const scoreResult = await createCandidateScore(scoreData);
        if (scoreResult.success) {
          console.log(`Successfully stored score for ${parameter.parameterName}: ${finalScore}`);
        } else {
          console.error(`Failed to store score for ${parameter.parameterName}:`, scoreResult.error);
        }
        
      } catch (paramError: any) {
        console.error(`Error processing parameter ${parameter.parameterName}:`, paramError);
        // Use fallback scoring for this parameter
        try {
          console.log(`Using fallback scoring for error case: ${parameter.parameterName}`);
          const fallbackScore = calculateFallbackScore(resumeData, parameter);
          
          await createCandidateScore({
            candidateId: candidateId,
            parameterId: parameter.id,
            score: fallbackScore.score,
            aiGenerated: true,
            notes: JSON.stringify({
              error: paramError.message,
              evidence: fallbackScore.evidence,
              reasoning: fallbackScore.reasoning,
              proficiencyFound: fallbackScore.proficiencyFound,
              matchQuality: fallbackScore.matchQuality,
              fallbackUsed: true,
              recalculated: true,
              recalculatedAt: new Date().toISOString()
            })
          });
          
          console.log(`Successfully stored fallback score for ${parameter.parameterName}: ${fallbackScore.score}`);
        } catch (fallbackError) {
          console.error(`Failed to store fallback score for ${parameter.parameterName}:`, fallbackError);
        }
      }
    }
    
    console.log(`Completed talent fit scoring for candidate ${candidateId}`);
    
    // Calculate overall talent fit score as weighted average
    try {
      // Fetch the actual scores from the database
      const storedScores = await db
        .select()
        .from(candidateScores)
        .where(eq(candidateScores.candidateId, candidateId));
      
      if (storedScores.length > 0) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        for (const scoreRecord of storedScores) {
          const parameter = parametersResult.data.find((p: any) => p.id === scoreRecord.parameterId);
          const weight = parameter?.weight || 1;
          totalWeightedScore += scoreRecord.score * weight;
          totalWeight += weight;
        }
        
        const overallTalentFitScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
        
        // Update the candidate's talent fit score
        const updateResult = await updateCandidate(candidateId, {
          talentFitScore: overallTalentFitScore
        });
        
        if (updateResult.success) {
          console.log(`Successfully updated talent fit score for candidate ${candidateId}: ${overallTalentFitScore}`);
        } else {
          console.error(`Failed to update talent fit score for candidate ${candidateId}:`, updateResult.error);
        }
      } else {
        console.log(`No scores found for candidate ${candidateId}, setting talent fit score to 0`);
        await updateCandidate(candidateId, { talentFitScore: 0 });
      }
    } catch (scoreCalculationError) {
      console.error('Error calculating overall talent fit score:', scoreCalculationError);
      // Set a fallback score of 0
      try {
        await updateCandidate(candidateId, { talentFitScore: 0 });
      } catch (fallbackError) {
        console.error('Failed to set fallback talent fit score:', fallbackError);
      }
    }
    
  } catch (error: any) {
    console.error('Error in calculateAndStoreTalentFitScores:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: candidateId } = await params;
    
    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Get candidate data
    const candidateResult = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (candidateResult.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateResult[0];
    
    // Parse resume data if available
    let resumeData = null;
    if (candidate.aiParsedData) {
      try {
        resumeData = JSON.parse(candidate.aiParsedData);
      } catch (error) {
        console.error('Error parsing resume data:', error);
        return NextResponse.json(
          { error: 'Invalid resume data format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'No resume data available for scoring' },
        { status: 400 }
      );
    }

    // Recalculate talent fit scores
    await calculateAndStoreTalentFitScores(candidateId, candidate.campaignId, resumeData);

    // Get updated candidate data
    const updatedCandidateResult = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    const updatedCandidate = updatedCandidateResult[0];

    return NextResponse.json({
      success: true,
      message: 'Talent fit score recalculated successfully',
      data: {
        candidateId: candidateId,
        talentFitScore: updatedCandidate.talentFitScore,
        recalculatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error recalculating talent fit score:', error);
    return NextResponse.json(
      { 
        error: 'Failed to recalculate talent fit score',
        message: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}