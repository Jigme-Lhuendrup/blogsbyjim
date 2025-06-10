const getBaseUrl = () => {
    return process.env.NODE_ENV === 'production'
        ? process.env.RENDER_EXTERNAL_URL || 'https://blogsbyjim.onrender.com'
        : `http://localhost:${process.env.PORT || 3000}`;
};

const getUrl = (path) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

module.exports = {
    getBaseUrl,
    getUrl
}; 