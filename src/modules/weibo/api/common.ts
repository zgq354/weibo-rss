import { AxiosError } from "axios";

export const TIME_OUT = 3000;
export const MOCK_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export const handleForbiddenErr = (err: AxiosError, cb: () => Promise<void>) => {
  if (err.response && [418, 403].includes(err.response.status)) {
    return cb();
  } else {
    return Promise.reject(err);
  }
}
