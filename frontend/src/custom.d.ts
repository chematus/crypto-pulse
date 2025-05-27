declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      REACT_APP_WEBSOCKET_URL: string;
    }
  }
}
