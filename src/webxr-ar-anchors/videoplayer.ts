import { Player } from "shaka-player";
import { Object3D, Vector3, WebGLRenderer } from "three";
import { PlayoutData } from "../helpers/playout-data";

export class VideoPlayer {
    private videoElement: HTMLVideoElement;
    private videoPlayer: Player;
    private videoLayer: XRQuadLayer | undefined;

    constructor() {
        this.videoElement = document.createElement('video');
        this.videoElement.crossOrigin = 'anonymous';
        this.videoElement.preload = 'auto';
        this.videoElement.autoplay = true;
        this.videoElement.controls = true;
    
        this.videoPlayer = new Player(this.videoElement);
    }

    public async init() {
        const asset: PlayoutData = this.assets[0];
        if (asset.drmUri) {
            this.videoPlayer.configure({
                drm: {
                    servers: {
                        'com.widevine.alpha': asset.drmUri
                    }
                }
            });
        }    
        await this.videoPlayer?.load(asset.streamUri);
    }

    private errorCount = 0;
    public async showVideoPlayer(renderer: WebGLRenderer, session: any, tv: Object3D) {
        try
        {
            const tvPosition: Vector3 = new Vector3();
            tv.getWorldPosition(tvPosition);

            const refSpace = renderer.xr.getReferenceSpace() as any;
            const xrMediaBinding = new XRMediaBinding(session);
        
            // const videoLayer = xrMediaBinding.createQuadLayer(this.videoElement, {
            //     space: refSpace
            //     });
                
            // videoLayer.transform = new XRRigidTransform({z: -2});
            // videoLayer.width = 0.5;
            // videoLayer.height = 0.25;
        
            // if (this.videoLayer !== undefined) {
            //     await this.videoLayer?.destroy;
            //     await session.updateRenderState({
            //         layers: [this.videoLayer, (renderer.xr as any).getBaseLayer()],
            //     } as any);
            // }

            await this.videoElement.play();

            this.videoLayer = await xrMediaBinding.createQuadLayer(this.videoElement, {
                space: refSpace,
                // layout: 'stereo-left-right',
                transform: new XRRigidTransform({
                    x: tvPosition.x,
                    y: tvPosition.y,
                    z: tvPosition.z,
                    w: 1,
                }),
                width: 0.36,
                height: 0.2,
            });

            session.updateRenderState({
                layers: [this.videoLayer, (renderer.xr as any).getBaseLayer()],
            } as any);

            this.errorCount = 0;
        } catch (e) {
            console.log('**** showVideoPlayer error', JSON.stringify(e));

            // TODO: fix this hack
            this.errorCount++;
            if (this.errorCount <=2) {
                setTimeout(() => this.showVideoPlayer(renderer, session, tv), 500);
            } else {
                this.errorCount = 0;
            }
        }
    }

    public async hideVideoPlayer(renderer: WebGLRenderer, session: any) {
        this.videoElement.pause();
    }

    private assets: Array<PlayoutData> = [
        {
            name: 'Jumanji Trailer | 30fps | 1080p',
            fps: 30,
            streamUri: 'https://d1wkjvw8nof1jc.cloudfront.net/jumanji-trailer-1_h1080p/encoded-20-05-09-fri-jan-2018/encoded-20-05-09-fri-jan-2018.mp4',
            layout: 'mono'
        },
        {
            name: 'Big buck bunny | 3D above/bellow | 30fps | 1080p',
            fps: 30,
            streamUri: 'http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_30fps_stereo_abl.mp4',
            layout: 'stereo-top-bottom'
        },
        {
            name: 'Dolby Digital 5.1 demo (sound doesn\'t play) | 30fps',
            fps: 30,
            streamUri: 'http://media.developer.dolby.com/DDP/MP4_HPL40_30fps_channel_id_51.mp4',
            layout: 'mono'
        },
        {
            name: 'Dolby Atmos demo (sound doesn\'t play) | 30fps',
            fps: 30,
            streamUri: 'http://media.developer.dolby.com/Atmos/MP4/shattered-3Mb.mp4',
            layout: 'mono'
        },
        {
            name: 'Sintel Dash | 3D Side by Side | 24fps',
            fps: 24,
            streamUri: 'https://g004-vod-us-cmaf-stg-ak.cdn.peacocktv.com/pub/global/sat/3D/FrameCompatibleSBS/master_cmaf.mpd',
            layout: 'stereo-left-right',
            default: true
        },
        {
            name: 'Sintel Dash Widevine | 24fps',
            fps: 24,
            streamUri: 'https://storage.googleapis.com/shaka-demo-assets/sintel-widevine/dash.mpd',
            layout: 'mono',
            drmUri: 'https://cwip-shaka-proxy.appspot.com/no_auth',
        }
    ];
}