import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: companyId } = await params;

    // Verify user has access to this company
    if (session.user.companyId !== companyId && session.user.role !== 'super-admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch company information
    const company = await db
      .select({
        id: companies.id,
        name: companies.name,
        email: companies.email,
        phone: companies.phone,
        address: companies.address,
        website: companies.website,
        industry: companies.industry,
        size: companies.size,
        description: companies.description,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company || company.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company[0]
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: companyId } = await params;

    // Verify user has access to this company
    if (session.user.companyId !== companyId && session.user.role !== 'super-admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, address, website, industry, size, description } = body;

    // Update company information
    const updatedCompany = await db
      .update(companies)
      .set({
        name,
        email,
        phone,
        address,
        website,
        industry,
        size,
        description,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updatedCompany || updatedCompany.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCompany[0],
      message: 'Company updated successfully'
    });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}