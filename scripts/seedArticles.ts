import 'dotenv/config';
import { dbConnect } from '@/lib/db/connect';
import Article from '@/lib/db/models/Article';
import { makeSlug } from '@/lib/utils/slug';

async function seed() {
  await dbConnect();
  console.log('[seed] connected');

  const dummy = await Article.create([
    {
      slug: makeSlug('Hello World'),
      title: 'Hello World',
      metaTitle: 'Hello World Meta',
      metaDescription: 'This is a dummy article for testing.',
      keywords: ['hello', 'world'],
      content: {
        markdown: '# Hello World\nThis is some dummy content.',
        html: '<h1>Hello World</h1><p>This is some dummy content.</p>',
      },
      status: 'draft',
    },
    {
      slug: makeSlug('Second Article'),
      title: 'Second Article',
      metaTitle: 'Second Article Meta',
      metaDescription: 'Another dummy.',
      keywords: ['test', 'article'],
      content: {
        markdown: '# Second\nMore dummy content.',
        html: '<h1>Second</h1><p>More dummy content.</p>',
      },
      status: 'review',
    },
  ]);

  console.log('Seeded:', dummy.length, 'articles');
  process.exit(0);
}

seed();
