import { BoxGeometry, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, WebGLRenderer, WebXRManager } from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { Controllers } from "../helpers/controllers";
import { EventType } from "../helpers/event-type";
import { AnchorsManager } from "./anchors-manager";
import { PlanesManager } from "./planes-manager";
import { VideoPlayer } from "./videoplayer";

export class AnchorsPlanesHitVideoScene {
    private renderer?: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private session?: THREE.XRSession | null;
    private anchorCubes = new Map();
    private anchorsAdded = new Set();
    private controller0?: Group;
    private controller1?: Group;
    private videoPlayer?: VideoPlayer;
    private planeManager?: PlanesManager;
    private controllers?: Controllers;
    private anchorsManager?: AnchorsManager;

    constructor() {
        this.scene = new Scene();

        this.camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

        this.init();
    }

    private async init() {
        const container = document.createElement( 'div' );
        document.body.appendChild( container );

        const light = new HemisphereLight( 0xffffff, 0xbbbbff, 1 );
        light.position.set( 0.5, 1, 0.25 );
        this.scene.add( light );

        //

        this.renderer = new WebGLRenderer( { antialias: true, alpha: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.xr.enabled = true;
        container.appendChild( this.renderer.domElement );
        this.renderer.setAnimationLoop(this.render);

        //

        this.initControllers();

        this.planeManager = new PlanesManager(this.renderer, this.scene);

        this.anchorsManager = new AnchorsManager(this.renderer!);
        this.initAnchors();

        window.addEventListener( 'resize', this.onWindowResize );

        this.renderer.xr.addEventListener( 'sessionstart', this.onSessionStart);

        this.session?.addEventListener('end', this.onDestroy);

        document.body.appendChild( ARButton.createButton( this.renderer, {
            requiredFeatures: ['anchors', 'plane-detection'], // TODO: add hit-test when working on Quest.
            optionalFeatures: [ 'hand-tracking', 'layers' ]
        } ) );
    }

    initControllers() {
        this.controller0 = this.renderer?.xr.getController( 0 );
        this.scene.add( this.controller0! );

        this.controller1 = this.renderer?.xr.getController( 1 );
        this.scene.add( this.controller1! );

        this.handleControllerEventsAnchors(this.controller0!);
        this.handleControllerEventsAnchors(this.controller1!);

        this.controllers = new Controllers(this.renderer!, this.scene, this.handleControllerEvent, this.controller0!, this.controller1!);
    }

    private onDestroy = () => {
        this.destroy();
    }

    private onSessionStart = async (event) => {
        this.camera.position.set( 0, 0, 0 );

        const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
        const persistentHandles = JSON.parse( val! ) || [];

        for (const uuid of persistentHandles) {
            (this.renderer?.xr as any).restoreAnchor( uuid );
        }

        this.session = (event.target as WebXRManager).getSession();
    }

    destroy() {
        this.planeManager?.destroy();
        this.clearAnchors();
        this.videoPlayer?.destroy();
        this.renderer?.xr.removeEventListener( 'sessionstart', this.onSessionStart);
        this.session?.removeEventListener('end', this.onDestroy);
        this.anchorsManager?.destroy();
    }

    private handleControllerEvent = (evt: EventType) => {
        switch (evt) {
            case EventType.pause:
                this.videoPlayer?.pause();
                break;
            case EventType.play:
                this.videoPlayer?.play();
                break;
            case EventType.exit:
                this.videoPlayer?.pause();
                this.session?.end();
                break;
            case EventType.sizeUp:
                // TODO
                break;
            case EventType.sizeDown:
                // TODO
                break;
        }
    }

    private initAnchors() {
        this.renderer?.xr.addEventListener( 'anchorposechanged', this.anchorChanged);
        this.renderer?.xr.addEventListener( 'anchorsdetected', this.anchorsDetected);
    }

    private clearAnchors() {
        this.renderer?.xr.removeEventListener( 'anchorposechanged', this.anchorChanged);
        this.renderer?.xr.removeEventListener( 'anchorsdetected', this.anchorsDetected);
    }

    private anchorChanged = (e) => {
        const { anchor, pose } = e.data;
        const anchorCube = this.anchorCubes.get( anchor );
        if ( pose ) {
            anchorCube.visible = true;
            anchorCube.matrix.fromArray( pose.transform.matrix );
        } else {
            anchorCube.visible = false;
        }
    };

    private anchorsDetected = async (e) => {
        const detectedAnchors = e.data;
        const referenceSpace = this.renderer?.xr.getReferenceSpace();

        // console.log( `Detected ${detectedAnchors.size} anchors` );

        detectedAnchors.forEach( async anchor => {
            if ( this.anchorsAdded.has( anchor ) ) return;

            this.anchorsAdded.add( anchor );
            const frame = await (this.renderer?.xr as any).getFrame();
            const anchorPose = await frame.getPose( anchor.anchorSpace, referenceSpace );

            const boxMesh = new Mesh(
                new BoxGeometry( 0.02, 0.02, 0.02 ),
                new MeshBasicMaterial( { color: 0xffffff * Math.random() } )
            );
            boxMesh.matrixAutoUpdate = false;
            await boxMesh.matrix.fromArray( anchorPose.transform.matrix );
            
            const cameraPosition = this.camera.position;

            // Should face the camera:
            const anchorRotation = Math.atan2( ( cameraPosition.x - boxMesh.position.x ), ( cameraPosition.z - boxMesh.position.z ) ); // Anchor should face the camera.
            boxMesh.rotation.y = anchorRotation;

            await this.scene?.add( boxMesh );

            if (this.videoPlayer === undefined) {
                this.videoPlayer = new VideoPlayer(this.controllers!);
                this.videoPlayer.init();
            }

            this.videoPlayer.showVideoPlayer(this.renderer!, this.session, boxMesh, this.camera);

            this.anchorCubes.set( anchor, boxMesh );
        } );
    };

    private handleControllerEventsAnchors(controller: Group) {
        controller.addEventListener('selectend', async (event: any) => {
            if (event.data.handedness === 'right') {
                console.log('right hand detected');
                return;
            }

            const anchorPosition = controller.position;
            const anchorRotation = new Quaternion().setFromEuler( controller.rotation );

            const anchorsId = 'webxr_ar_anchors_handles';
            const val = localStorage.getItem( anchorsId );
            const persistentHandles = JSON.parse( val! ) || [];

            if ( persistentHandles.length >= 1 ) {
                // Clear the anchors.
                while( persistentHandles.length != 0 ) {
                    const handle = persistentHandles.pop();
                    await (this.renderer?.xr as any).deleteAnchor( handle );
                    await localStorage.setItem( anchorsId, JSON.stringify( persistentHandles ) );
                }

                this.anchorCubes.forEach( ( cube ) => {
                    this.scene?.remove( cube );
                } );

                this.anchorCubes = new Map();
            } else {
                const uuid = await (this.renderer?.xr as any).createAnchor( anchorPosition, anchorRotation, true );
                persistentHandles.push( uuid );
                localStorage.setItem( anchorsId, JSON.stringify(persistentHandles) );
            }
        });
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer?.setSize( window.innerWidth, window.innerHeight );
    }

    private render = () => {
        if (!this.renderer?.xr.isPresenting) return;
        this.renderer.render(this.scene, this.camera);
        this.controllers?.update();
    }
}