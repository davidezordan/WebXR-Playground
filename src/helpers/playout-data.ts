export type PlayoutData = {
    name: string;
    streamUri: string;
    drmUri?: string;
    fps: FPS;
    layout: StereoLayout;
    default?: boolean;
};

export type FPS = 24 | 30;

export type StereoLayout = 'mono' | 'stereo-left-right' | 'stereo-top-bottom';
