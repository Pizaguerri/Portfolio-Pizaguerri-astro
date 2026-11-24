
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  // 1. Traemos los posts del blog
  const blogPosts = await getCollection('blog');

  // 2. Traemos los proyectos
  const projects = await getCollection('projects');

  // 3. Los unimos todos en un solo array
  const allItems = [...blogPosts, ...projects];

  // 4. Excluimos los borradores
  const publishedItems = allItems.filter(
    (item) => !item.data.draft
  );

  // 5. Mapeamos cada item al formato RSS
  const rssItems = publishedItems.map((item) => ({
    title: item.data.title,
    description: item.data.description || item.data.summary || '',
    pubDate: item.data.date,
    link: item.collection === 'projects'
      ? `/proyectos/${item.id}`
      : `/blog/${item.id}`,
  }));

  // 6. Ordenamos por fecha (del más nuevo al más antiguo)
  rssItems.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  // 7. Generamos el feed
  return rss({
    title: 'Pablo Izaguerri',
    description: 'Portfolio de fotografía y antropología visual',
    site: context.site,
    items: rssItems,
    customData: `<language>ca-ES</language>`,
  });
}
