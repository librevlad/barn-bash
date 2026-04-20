// client-controller/controller.jsx
// Entry point. Every lib / widget / screen / contract file loaded before
// this has registered itself on the window, so App can just mount.

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
