interface ConnectionStateProps {
  isConnected: boolean;
}

const ConnectionState: React.FC<ConnectionStateProps> = ({ isConnected }) => {
  return <p>State: {'' + isConnected}</p>;
};

export default ConnectionState;
