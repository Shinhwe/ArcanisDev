import styles from './index.module.scss';

const tracks = [
  'Public read APIs',
  'Authentication',
  'User control panel',
  'Admin control panel',
];

const Home = () => {
  return (
    <section className={styles.root}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Current Slice</p>
        <h1>CMS migration workspace</h1>
        <p className={styles.lede}>
          The new React shell and ASP.NET Core API are now the working surface
          for the gradual CMS migration. Public read-only slices land here
          first, then authentication and control panel flows follow behind them.
        </p>
        <div className={styles.stack}>
          <span>React Router</span>
          <span>RxJS</span>
          <span>Normalize.css</span>
          <span>SCSS</span>
          <span>ESNext</span>
        </div>
      </div>

      <div className={styles.panels}>
        <article className={styles.panel}>
          <h2>Platform boundary</h2>
          <p>
            The shared transport layer lives in{' '}
            <code>apps/web/src/app/http</code>, while this route keeps its own
            request entry point in <code>apps/web/src/pages/Home/index.service.ts</code>.
            The ASP.NET Core service in <code>apps/api</code> stays aligned as
            the RESTful backend target for each migrated slice.
          </p>
        </article>
        <article className={styles.panel}>
          <h2>Migration queue</h2>
          <ul className={styles.trackList}>
            {tracks.map((track) => (
              <li key={track}>{track}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
};

export default Home;
