import styles from './Header.module.css';

export default function Header() {
  return <header className={styles.container}>
    <a href='/'>
      <img src='/logo.png'
        className={styles.logo}
        alt='Crypto Pulse Logo'
        title='Crypto Pulse'
      />
    </a>
  </header>;
}
