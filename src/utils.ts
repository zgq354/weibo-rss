/**
 * 处理终端传来的端口号
 * @param val 端口号字符串
 */
export const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

export const waitMs = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
