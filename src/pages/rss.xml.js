
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  // Obtener los artículos del blog.
  const blogPosts = await getCollection('blog');

  // Obtener los proyectos.
  const projects = await getCollection('projects');

  // Unir ambas colecciones.
  const allItems = [...blogPosts, ...projects];

  // Excluir borradores y contenidos sin fecha.
  const publishedItems = allItems.filter(
    (item) => !item.data.draft && item.data.date instanceof Date
  );

  // Convertir los contenidos al formato RSS.
  const rssItems = publishedItems.map((item) => ({
    title: item.data.title,
    description: item.data.description || item.data.summary || '',
    pubDate: item.data.date,
    link: item.collection === 'projects'
      ? `/proyectos/${item.id}`
      : `/blog/${item.id}`,
  }));

  // Ordenar cronológicamente, del más reciente al más antiguo.
  rssItems.sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
  );

  // Generar el feed RSS.
  return rss({
    title: 'Pablo Izaguerri',
    description: 'Portfolio de fotografía y antropología visual',
    site: context.site,
    items: rssItems,
    customData: '<language>ca-ES</language>',
  });
}
