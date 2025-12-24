import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { quiltId: string } }
) {
  try {
    const { quiltId } = params;
    const aggregator = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
    
    // Clean and validate the quiltId
    const cleanQuiltId = quiltId.trim();
    if (!cleanQuiltId) {
      return NextResponse.json(
        { error: "Quilt ID is required" },
        { status: 400 }
      );
    }

    // Use the correct endpoint based on the ID format
    let endpoint: string;
    if (cleanQuiltId.includes('_')) {
      // This is a quilt patch ID
      endpoint = `/v1/blobs/by-quilt-patch-id/${encodeURIComponent(cleanQuiltId)}`;
    } else if (cleanQuiltId.includes('/')) {
      // This is a quilt_id/identifier format
      const [quiltId, identifier] = cleanQuiltId.split('/');
      endpoint = `/v1/blobs/by-quilt-id/${encodeURIComponent(quiltId)}/${encodeURIComponent(identifier)}`;
    } else {
      // This is a regular blob ID
      endpoint = `/v1/blobs/${encodeURIComponent(cleanQuiltId)}`;
    }
    
    // Construct the full URL
    const url = new URL(endpoint, aggregator).toString();

    // Set up headers
    const headers = new Headers({
      'Accept': 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'User-Agent': 'draftshub/1.0'
    });

    // Add authorization if present
    const auth = req.headers.get("authorization");
    if (auth) {
      headers.set("authorization", auth);
    }

    console.log(`Fetching from Walrus API: ${url}`);
    
    // Make the request
    const res = await fetch(url, { 
      method: "GET",
      headers,
      cache: 'no-store' // Ensure we don't get cached responses
    });

    if (!res.ok) {
      let errorDetails;
      try {
        const errorBody = await res.json();
        errorDetails = errorBody.error || errorBody.message || 'No additional details';
      } catch {
        errorDetails = await res.text().catch(() => 'Unknown error');
      }
      
      console.error(`Walrus API error (${res.status}):`, errorDetails);
      
      return NextResponse.json(
        { 
          error: "Failed to fetch quilt patch",
          status: res.status,
          statusText: res.statusText,
          details: errorDetails,
          url
        },
        { status: res.status }
      );
    }

    try {
      // Get the binary data and convert it to base64
      const data = await res.arrayBuffer();
      const base64Data = Buffer.from(data).toString('base64');
      
      // Get metadata from response headers
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const identifier = res.headers.get('X-Quilt-Patch-Identifier') || 'blob';
      const etag = res.headers.get('etag') || '';
      
      // Log successful response (without the actual data)
      console.log(`Successfully fetched ${data.byteLength} bytes with content type: ${contentType}`);
      
      // Return the response with metadata
      return NextResponse.json({
        success: true,
        encryptedContent: base64Data,
        identifier,
        etag,
        contentType,
        size: data.byteLength
      });
    } catch (error) {
      console.error('Error processing response:', error);
      throw new Error(`Failed to process response: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error("Error in GET /api/walrus/quilts/[quiltId]:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      quiltId: params?.quiltId,
      daemon: process.env.NEXT_PUBLIC_WALRUS_DAEMON
    });
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
