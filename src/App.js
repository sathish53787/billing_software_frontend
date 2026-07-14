import './App.css';
import Routers from './routes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastIcon = ({ type }) => {
  if (type === 'error') {
    return <span className="stv-toast-icon stv-toast-icon--error">!</span>;
  }
  if (type === 'success') {
    return <span className="stv-toast-icon stv-toast-icon--success">✓</span>;
  }
  if (type === 'warning') {
    return <span className="stv-toast-icon stv-toast-icon--warning">!</span>;
  }
  return <span className="stv-toast-icon stv-toast-icon--info">i</span>;
};

function App() {
  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        pauseOnFocusLoss
        limit={3}
        theme="light"
        icon={ToastIcon}
        className="stv-toast-container"
        toastClassName="stv-toast"
        bodyClassName="stv-toast-body"
        progressClassName="stv-toast-progress"
        closeButton
      />
      <Routers />
    </div>
  );
}

export default App;
