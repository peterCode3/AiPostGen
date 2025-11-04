/**
 * SEO Widget - Shows metadata preview
 */

type SeoWidgetProps = {
  metadata: {
    metaTitle?: string;
    title?: string;
    metaDescription?: string;
    keywords?: string[];
  };
};

export default function SeoWidget({ metadata }: SeoWidgetProps) {
  const title = metadata?.metaTitle || metadata?.title || '';
  const description = metadata?.metaDescription || '';
  const keywords = metadata?.keywords || [];

  return (
    <div className="space-y-4">
      {/* Meta Title */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Meta Title</label>
          <span className={`text-xs font-medium ${
            title.length > 60 ? 'text-red-600' : 'text-green-600'
          }`}>
            {title.length}/60 chars
          </span>
        </div>
        <p className="text-gray-900 text-sm">
          {title || <span className="text-gray-400 italic">No title set</span>}
        </p>
      </div>

      {/* Meta Description */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-semibold text-gray-700">Meta Description</label>
          <span className={`text-xs font-medium ${
            description.length > 160 ? 'text-red-600' : 'text-green-600'
          }`}>
            {description.length}/160 chars
          </span>
        </div>
        <p className="text-gray-900 text-sm">
          {description || <span className="text-gray-400 italic">No description set</span>}
        </p>
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Keywords</label>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Google Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="text-sm font-semibold text-gray-700 mb-3 block">
          🔍 Google Search Preview
        </label>
        <div className="space-y-1">
          <div className="text-blue-600 text-lg hover:underline cursor-pointer">
            {title || 'Your Title Here'}
          </div>
          <div className="text-green-700 text-xs">
            https://yoursite.com/article-slug
          </div>
          <div className="text-gray-600 text-sm">
            {description || 'Your meta description will appear here...'}
          </div>
        </div>
      </div>
    </div>
  );
}
