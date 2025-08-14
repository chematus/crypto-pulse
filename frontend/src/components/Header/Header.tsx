import styles from './Header.module.css';

const CONNECTED_MESSAGE = '✓ Connected';
const DISCONNECTED_MESSAGE = '✘ Disconnected';

export default function Header({ isConnected }: { isConnected: boolean }) {
  return <header className={styles.container}>
    <a href='/'>
      <img src='/logo.png'
        className={styles.logo}
        alt='Crypto Pulse Logo'
        title='Crypto Pulse'
      />
    </a>
    <div className={styles.status}>
      <span className={isConnected ? styles.connected : styles.disconnected}>
        {isConnected ? CONNECTED_MESSAGE : DISCONNECTED_MESSAGE}
      </span>
    </div>
  </header>;
}
