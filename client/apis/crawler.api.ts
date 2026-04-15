import { AxiosResponse } from 'axios';
import { VideoInfo } from '../interface/crawler.interface';
import { req_to_server } from '../utils/requests';

export const getBiliVideoApi = async (): Promise<
  AxiosResponse<{ data: VideoInfo[] }>
> => {
  return await req_to_server('/crawler/bili');
};
