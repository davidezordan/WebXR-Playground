import { BoxGeometry, CylinderGeometry, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Quaternion, RingGeometry, Scene, WebGLRenderer, WebXRManager } from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { PlanesManager } from "./planes-manager";
import { VideoPlayer } from "./videoplayer";

export class AnchorsPlanesHitVideoScene {
    private renderer;
    private scene;
    private camera;
    private session;
    private anchorCubes = new Map();
    private anchorsAdded = new Set();
    private controller0;
    private controller1;
    private videoPlayer: VideoPlayer | undefined;
    private reticle;
    private hitTestSource = null;
    private hitTestSourceRequested = false;
    private planeManager?: PlanesManager;

    constructor() {
        this.init();
        this.animate();
    }

    private init() {

        const container = document.createElement( 'div' );
        document.body.appendChild( container );

        this.scene = new Scene();

        this.camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

        const light = new HemisphereLight( 0xffffff, 0xbbbbff, 1 );
        light.position.set( 0.5, 1, 0.25 );
        this.scene.add( light );

        //

        this.renderer = new WebGLRenderer( { antialias: true, alpha: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.xr.enabled = true;
        container.appendChild( this.renderer.domElement );

        //

        document.body.appendChild( ARButton.createButton( this.renderer, {
            requiredFeatures: ['anchors', 'plane-detection'],
            optionalFeatures: [ 'hand-tracking', 'layers' ]
        } ) );

        this.controller0 = this.renderer.xr.getController( 0 );
        this.scene.add( this.controller0 );

        this.controller1 = this.renderer.xr.getController( 1 );
        this.scene.add( this.controller1 );

        // this.handleControllerEventsHitTest(this.controller0);
        this.handleControllerEventsAnchors(this.controller0);
        this.handleControllerEventsAnchors(this.controller1);

        window.addEventListener( 'resize', this.onWindowResize );

        this.renderer.xr.addEventListener( 'sessionstart', async (event) => {
            this.camera.position.set( 0, 0, 0 );

            const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
            const persistentHandles = JSON.parse( val! ) || [];

            for (const uuid of persistentHandles) {
                this.renderer.xr.restoreAnchor( uuid );
            }

            this.session = (event.target as WebXRManager).getSession();
        } );

        // Init planes.
        this.planeManager = new PlanesManager(this.renderer);

        this.initAnchors();

        // this.initHitTest();

        this.session.addEventListener('end', () => {
            this.destroy();
        });
    }

    destroy() {
        this.planeManager?.destroy();

        this.clearAnchors();
    }

    private initAnchors() {
        // TODO: move to separate class.

        this.renderer.xr.addEventListener( 'anchoradded', this.anchorAdded);
        this.renderer.xr.addEventListener( 'anchorremoved', this.anchorRemoved);
        this.renderer.xr.addEventListener( 'anchorposechanged', this.anchorChanged);
        this.renderer.xr.addEventListener( 'anchorsdetected', this.anchorsDetected);
    }

    private clearAnchors() {
        this.renderer.xr.removeEventListener( 'anchoradded', this.anchorAdded);
        this.renderer.xr.removeEventListener( 'anchorremoved', this.anchorRemoved);
        this.renderer.xr.removeEventListener( 'anchorposechanged', this.anchorChanged);
        this.renderer.xr.removeEventListener( 'anchorsdetected', this.anchorsDetected);
    }

    private anchorAdded = (e) => {
        // console.log( "anchor added", e.data )
    };

    private anchorRemoved = (e) => {
        // console.log( "anchor removed", e.data )
    };

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
        const referenceSpace = this.renderer.xr.getReferenceSpace();

        // console.log( `Detected ${detectedAnchors.size} anchors` );

        detectedAnchors.forEach( async anchor => {
            if ( this.anchorsAdded.has( anchor ) ) return;

            this.anchorsAdded.add( anchor );
            const frame = await this.renderer.xr.getFrame();
            const anchorPose = await frame.getPose( anchor.anchorSpace, referenceSpace );

            const boxMesh = new Mesh(
                new BoxGeometry( 0.150, 0.075, 0.02 ),
                new MeshBasicMaterial( { color: 0xffffff * Math.random() } )
            );
            boxMesh.matrixAutoUpdate = false;
            await boxMesh.matrix.fromArray( anchorPose.transform.matrix );
            await this.scene.add( boxMesh );

            if (this.videoPlayer === undefined) {
                this.videoPlayer = new VideoPlayer();
                this.videoPlayer.init();
            }

            this.videoPlayer.showVideoPlayer(this.renderer, this.session, boxMesh);

            this.anchorCubes.set( anchor, boxMesh );
        } );
    };

    private initHitTest() {
        //

        // TODO: investigate why it's not working on Quest.

        this.reticle = new Mesh(
            new RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new MeshBasicMaterial()
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );

        //
    }

    private handleControllerEventsHitTest(controller: Group) {
        controller.addEventListener('select', async (event: any) => {
            const geometry = new CylinderGeometry( 0.1, 0.1, 0.2, 32 ).translate( 0, 0.1, 0 );
            if ( this.reticle.visible ) {
                const material = new MeshPhongMaterial( { color: 0xffffff * Math.random() } );
                const mesh = new Mesh( geometry, material );
                this.reticle.matrix.decompose( mesh.position, mesh.quaternion, mesh.scale );
                mesh.scale.y = Math.random() * 2 + 1;
                this.scene.add( mesh );
            }
        })
    };

    private handleControllerEventsAnchors(controller: Group) {
        controller.addEventListener('selectend', async (event: any) => {
            if (event.data.handedness === 'right') {
                console.log('right hand detected');
                return;
            }

            const controllerPosition = controller.position;
            const controllerRotation = new Quaternion().setFromEuler( controller.rotation );

            const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
            const persistentHandles = JSON.parse( val! ) || [];

            if ( persistentHandles.length >= 1 ) {
                while( persistentHandles.length != 0 ) {
                    const handle = persistentHandles.pop();
                    await this.renderer.xr.deleteAnchor( handle );
                    await localStorage.setItem( 'webxr_ar_anchors_handles', JSON.stringify( persistentHandles ) );
                    await this.videoPlayer?.hideVideoPlayer(this.renderer, this.session);
                }

                this.anchorCubes.forEach( ( cube, handle ) => {
                    this.scene.remove( cube );
                } );

                this.anchorCubes = new Map();

            } else {
                const uuid = await this.renderer.xr.createAnchor( controllerPosition, controllerRotation, true );
                //const uuid = await this.renderer.xr.createAnchor( controllerPosition, true );
                persistentHandles.push( uuid );
                localStorage.setItem( 'webxr_ar_anchors_handles', JSON.stringify(persistentHandles) );
            }
        });
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

// //

    private animate() {
        this.renderer.setAnimationLoop( this.render );
    }

    private render = (timestamp, frame) => {
        if ( frame ) {
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const session = this.renderer.xr.getSession();

            if ( this.hitTestSourceRequested === false ) {
                session.requestReferenceSpace('viewer').then( referenceSpace => {
                    session.requestHitTestSource( { space: referenceSpace } )
                    .then( ( source ) => {
                        this.hitTestSource = source;
                    } );

                } );

                session.addEventListener( 'end', () => {
                    this.hitTestSourceRequested = false;
                    this.hitTestSource = null;
                } );

                this.hitTestSourceRequested = true;
            }

            if ( this.hitTestSource ) {

                const hitTestResults = frame.getHitTestResults( this.hitTestSource );

                if ( hitTestResults.length ) {
                    const hit = hitTestResults[ 0 ];

                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );
                } else {
                    this.reticle.visible = false;
                }
            }
        }

        this.renderer.render( this.scene, this.camera );
    }
}