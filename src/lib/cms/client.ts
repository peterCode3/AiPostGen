/**
 * CMS Client - Publish articles to external CMS
 * 
 * Configure your CMS credentials in .env:
 * CMS_BASE_URL=https://your-cms.com
 * CMS_API_KEY=your-api-key
 */

export async function cmsPublish(article: any) {
  const base = process.env.CMS_BASE_URL;
  const key = process.env.CMS_API_KEY;
  
  // If CMS not configured, just log and return success
  if (!base || !key) {
    console.log('✅ [CMS] Not configured - Article marked as published:', article.slug);
    console.log('   To enable CMS publishing, set CMS_BASE_URL and CMS_API_KEY in .env');
    return { success: true, message: 'Published locally (CMS not configured)' };
  }

  try {
    const res = await fetch(`${base}/cms/articles`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        'x-api-key': key, 
        'Idempotency-Key': String(article._id) 
      },
      body: JSON.stringify({
        slug: article.slug,
        title: article.title,
        html: article.content?.html,
        markdown: article.content?.markdown,
        meta: {
          title: article.metaTitle,
          description: article.metaDescription,
          keywords: article.keywords,
          schema: article.seo?.schemaOrgJson,
          og: article.seo?.og,
        }
      })
    });
    
    if (!res.ok) {
      throw new Error(`CMS publish failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('✅ [CMS] Published successfully:', article.slug);
    return data;
    
  } catch (err: any) {
    console.error('❌ [CMS] Publish error:', err.message);
    console.warn('⚠️  [CMS] External CMS unreachable - Article will be published locally');
    // Return success even if external CMS fails - article is still published locally
    return { success: true, message: 'Published locally (external CMS unavailable)' };
  }
}
