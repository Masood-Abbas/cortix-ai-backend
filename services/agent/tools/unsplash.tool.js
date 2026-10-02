const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

export const getUnsplashImages = async (query, count = 6) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_API_KEY;
  if (!accessKey || typeof query !== "string" || !query.trim()) return [];

  const url = new URL(UNSPLASH_SEARCH_URL);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", String(Math.min(Math.max(count, 1), 12)));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data?.results)) return [];

    return data.results
      .map((image) => ({
        alt: image.alt_description || image.description || "Unsplash image",
        url: image.urls?.regular || image.urls?.small || image.urls?.raw,
        credit: image.user?.name,
        creditUrl: image.user?.links?.html,
      }))
      .filter((image) => image.url);
  } catch {
    return [];
  }
};
