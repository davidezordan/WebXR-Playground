import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { Player } from 'shaka-player';
import { PlayoutData } from '../helpers/playout-data';

let camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer;
let controller: THREE.Object3D<THREE.Event> | THREE.Group;
let videoElement;
let videoPlayer: Player;

init();
animate();

async function createVideoPlayer() {
    if (videoPlayer) {
        return;
    }

    const assets: Array<PlayoutData> = [
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

    videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.preload = 'auto';
    videoElement.autoplay = true;
    videoElement.controls = true;

    videoPlayer = new Player(videoElement);
    const asset: PlayoutData = assets[0];
    if (asset.drmUri) {
        videoPlayer?.configure({
            drm: {
                servers: {
                    'com.widevine.alpha': asset.drmUri
                }
            }
        });
    }

    await videoPlayer?.load(asset.streamUri);
}

function init() {
    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

    const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    light.position.set( 0.5, 1, 0.25 );
    scene.add( light );

    //

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    container.appendChild( renderer.domElement );

    //

    document.body.appendChild( ARButton.createButton( renderer ) );

    //

    const geometry = new THREE.CylinderGeometry( 0, 0.05, 0.2, 32 ).rotateX( Math.PI / 2 );

    function onSelect() {

        const material = new THREE.MeshPhongMaterial( { color: 0xffffff * Math.random() } );
        const mesh = new THREE.Mesh( geometry, material );
        mesh.position.set( 0, 0, - 0.3 ).applyMatrix4( controller.matrixWorld );
        mesh.quaternion.setFromRotationMatrix( controller.matrixWorld );
        scene.add( mesh );

        createVideoPlayer();

    }

    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'select', onSelect );
    scene.add( controller );

    window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    renderer.setAnimationLoop( render );
}

function render() {
    renderer.render( scene, camera );
}