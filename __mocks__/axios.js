// Manual Jest mock for axios so tests can set axios.post.mockResolvedValue
// and axios.post.mockRejectedValue reliably.

const axios = jest.fn(() => axios);

axios.create = jest.fn(() => axios);
axios.post = jest.fn();
axios.get = jest.fn();
axios.request = jest.fn();
axios.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };

module.exports = axios;
