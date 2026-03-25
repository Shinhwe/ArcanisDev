import styles from './index.module.scss';

const Playground = () => {
  return (
    <section className={styles.root}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Sandbox</p>
        <h1>Playground</h1>
        <p className={styles.description}>
          Use this route for isolated UI spikes, API wiring experiments, and
          future `rxjs` exploration without polluting migrated pages.
        </p>
      </div>
    </section>
  );
};

export default Playground;
