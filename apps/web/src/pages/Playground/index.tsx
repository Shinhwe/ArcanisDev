import styles from './index.module.scss';

const Playground = () => {
  return (
    <section className={styles.root}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Internal Route</p>
        <h1>Integration lab</h1>
        <p className={styles.description}>
          Use this route for temporary UI spikes, endpoint contract checks, and
          RxJS experiments before they are folded into migrated pages.
        </p>
      </div>
    </section>
  );
};

export default Playground;
