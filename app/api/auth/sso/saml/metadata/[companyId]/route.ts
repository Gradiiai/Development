import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { ssoConfigurations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { XMLBuilder } from 'fast-xml-parser';

// GET - SAML Metadata endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    // Get SAML configuration for the company
    const config = await db
      .select()
      .from(ssoConfigurations)
      .where(
        and(
          eq(ssoConfigurations.companyId, companyId),
          eq(ssoConfigurations.provider, 'saml'),
          eq(ssoConfigurations.isActive, true)
        )
      )
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json(
        { error: 'SAML configuration not found or inactive' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const entityId = `${baseUrl}/api/auth/sso/saml/metadata/${companyId}`;
    const acsUrl = `${baseUrl}/api/auth/sso/saml/acs/${companyId}`;

    // Build SAML metadata XML
    const metadata = {
      'md:EntityDescriptor': {
        '@_xmlns:md': 'urn:oasis:names:tc:SAML:2.0:metadata',
        '@_entityID': entityId,
        'md:SPSSODescriptor': {
          '@_AuthnRequestsSigned': 'false',
          '@_WantAssertionsSigned': 'true',
          '@_protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol',
          'md:NameIDFormat': 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          'md:AssertionConsumerService': {
            '@_Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
            '@_Location': acsUrl,
            '@_index': '1',
            '@_isDefault': 'true',
          },
        },
      },
    };

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true,
    });

    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
    const xmlContent = builder.build(metadata);
    const fullXml = xmlDeclaration + '\n' + xmlContent;

    return new NextResponse(fullXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating SAML metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}