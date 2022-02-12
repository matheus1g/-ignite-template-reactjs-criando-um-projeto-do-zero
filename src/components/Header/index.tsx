import styles from './header.module.scss';

export default function Header(): JSX.Element {
  return (
    <header className={styles.container}>
      <div>
        <img src="/logo.svg" alt="logo" />
      </div>
    </header>
  );
}
