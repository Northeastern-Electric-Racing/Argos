import ProxyServer from './proxy-server';
export default interface ProxyClient {
    configure: () => void;
    addProxyServer: (proxyServer: ProxyServer) => void;

}