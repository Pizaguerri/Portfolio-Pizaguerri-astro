import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  // 1. Traemos los posts del blog (Editorial)
  const blogPosts = await getCollection('blog');
  
  // 2. Traemos los proyectos
  const projects = await getCollection('projects');

  // 3. Los unimos todos en un solo array
  const allItems = [...blogPosts, ...projects];

  // 4. Filtramos para que solo salgan los que están en catalán (o el idioma que quieras)
  // y que no sean borradores (draft: false)
  const publishedItems = allItems.filter(item => 
    item.id.endsWith('.ca') && !item.data.draft
  );

  // 5. Mapeamos cada item al formato que espera el RSS
  const rssItems = publishedItems.map(item => ({
    title: item.data.title,
    description: item.data.description || item.data.summary || '',
    pubDate: item.data.date,
    // Creamos el enlace según si es un proyecto o un post
    link: item.collection === 'projects' 
      ? `/proyectos/${item.id.replace('.ca', '')}` 
      : `/blog/${item.id.replace('.ca', '')}`,
  }));

  // 6. Ordenamos por fecha (del más nuevo al más antiguo)
  rssItems.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  // 7. Generamos el feed
  return rss({
    title: 'Pablo Izaguerri',
    description: 'Portfolio de fotografía y antropología visual',
    site: context.site,
    items: rssItems,
    // Añadimos el idioma para que los lectores lo detecten bien
    customData: `<language>ca-ES</language>`,
  });
}