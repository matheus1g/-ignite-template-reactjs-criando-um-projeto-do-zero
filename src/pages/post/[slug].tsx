/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Prismic from '@prismicio/client';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface Nav {
  previousPageTitle: string | null;
  previousPageLink: string | null;
  nextPageTitle: string | null;
  nextPageLink: string | null;
}

interface PostProps {
  post: Post;
  nav: Nav;
}

export default function Post({ post, nav }: PostProps): JSX.Element {
  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );
  const formattedLastDate = format(
    new Date(post.last_publication_date),
    "'* editado em 'dd MMM yyyy', às 'HH:mm",
    {
      locale: ptBR,
    }
  );

  const equalDate = post.last_publication_date !== post.first_publication_date;

  return (
    <>
      <Head>
        <title>{`${post.data.title} | SpaceTraveling`}</title>
      </Head>
      <img src={post.data.banner.url} alt="Banner" className={styles.img} />
      <main className={commonStyles.container}>
        <div className={styles.postHead}>
          <h1>{post.data.title}</h1>
          <div>
            <time>
              <FiCalendar className={commonStyles.icon} /> {formattedDate}
            </time>
            <span>
              <FiUser className={commonStyles.icon} /> {post.data.author}
            </span>
            <span>
              <FiClock className={commonStyles.icon} /> {readTime} min
            </span>
          </div>
          <p>{equalDate && formattedLastDate}</p>
        </div>

        {post.data.content.map(content => {
          return (
            <article className={styles.post} key={post.uid}>
              <h1>{content.heading}</h1>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          );
        })}
        <div className={styles.divisor} />
        <section className={styles.navigation}>
          {nav.previousPageTitle && (
            <Link href={`/post/${nav.previousPageLink}`}>
              <a>
                <div>
                  <h3>{nav.previousPageTitle}</h3>
                  <span>Post anterior</span>
                </div>
              </a>
            </Link>
          )}
          {nav.nextPageTitle && (
            <Link href={`/post/${nav.nextPageLink}`}>
              <a>
                <div className={styles.nextPage}>
                  <h3>{nav.nextPageTitle}</h3>
                  <span>Proximo post</span>
                </div>
              </a>
            </Link>
          )}
        </section>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts')
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const previousPost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
    })
  ).results[0];

  const nextPost = (
    await prismic.query(Prismic.predicates.at('document.type', 'posts'), {
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  const nav = {
    previousPageTitle: previousPost ? previousPost.data.title : null,
    previousPageLink: previousPost ? previousPost.uid : null,
    nextPageTitle: nextPost ? nextPost.data.title : null,
    nextPageLink: nextPost ? nextPost.uid : null,
  };

  return {
    props: {
      post,
      nav,
    },
    redirect: 60 * 30, // 30 minutes
  };
};
