import { BoxBufferGeometry, CylinderGeometry, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Quaternion, RingGeometry, Scene, WebGLRenderer, WebXRManager } from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { VideoPlayer } from "./videoplayer";

export class AnchorsPlanesScene {
    private renderer;
    private scene;
    private camera;
    private session;
    private anchorCubes = new Map();
    private anchorsAdded = new Set();
    private controller0;
    private controller1;
    private videoPlayer: VideoPlayer | undefined;
    private planesAdded = new Set();
    private reticle;
    private hitTestSource = null;
    private hitTestSourceRequested = false;

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
            requiredFeatures: ['anchors', 'plane-detection', 'hit-test'],
            optionalFeatures: [ 'hand-tracking', 'layers' ]
        } ) );

        this.controller0 = this.renderer.xr.getController( 0 );
        this.scene.add( this.controller0 );

        this.controller1 = this.renderer.xr.getController( 1 );
        this.scene.add( this.controller1 );

        this.handleControllerEventsHitTest(this.controller0);
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

        this.initPlanes();

        this.initAnchors();

        this.initHitTest();
    }   

    private initAnchors() {
        this.renderer.xr.addEventListener( 'anchoradded', (e) => {
            // console.log( "anchor added", e.data )
        } );

        this.renderer.xr.addEventListener( 'anchorremoved', (e) => {
            // console.log( "anchor removed", e.data )
        } );

        this.renderer.xr.addEventListener( 'anchorposechanged', (e) => {
            const { anchor, pose } = e.data;
            const anchorCube = this.anchorCubes.get( anchor );
            if ( pose ) {
                anchorCube.visible = true;
                anchorCube.matrix.fromArray( pose.transform.matrix );
            } else {
                anchorCube.visible = false;
            }
        } );

        this.renderer.xr.addEventListener( 'anchorsdetected', async (e) => {
            const detectedAnchors = e.data;
            const referenceSpace = this.renderer.xr.getReferenceSpace();

            // console.log( `Detected ${detectedAnchors.size} anchors` );

            detectedAnchors.forEach( async anchor => {
                if ( this.anchorsAdded.has( anchor ) ) return;

                this.anchorsAdded.add( anchor );
                const frame = this.renderer.xr.getFrame();
                const anchorPose = frame.getPose( anchor.anchorSpace, referenceSpace );

                const boxMesh = new Mesh(
                    new BoxBufferGeometry( 0.150, 0.075, 0.02 ),
                    new MeshBasicMaterial( { color: 0xffffff * Math.random() } )
                );
                boxMesh.matrixAutoUpdate = false;
                boxMesh.matrix.fromArray( anchorPose.transform.matrix );
                this.scene.add( boxMesh );

                if (this.videoPlayer === undefined) {
                    this.videoPlayer = new VideoPlayer();
                    this.videoPlayer.init();
                }

                this.videoPlayer.showVideoPlayer(this.renderer, this.session, boxMesh);

                this.anchorCubes.set( anchor, boxMesh );
            } );
        } );
    }

    private initPlanes() {
        this.renderer.xr.addEventListener( 'planeadded', (e) => {
            console.log( "plane added", e.data )
        });
    
        this.renderer.xr.addEventListener( 'planeremoved', (e) => {
            console.log( "plane removed", e.data )
        });
    
        this.renderer.xr.addEventListener( 'planechanged', (e) => {
            console.log( "plane changed", e.data)
        });

        this.renderer.xr.addEventListener( 'planesdetected', (e) => {
            const detectedPlanes = e.data;
            const referenceSpace = this.renderer.xr.getReferenceSpace();
    
            console.log( `Detected ${detectedPlanes.size} planes` );
    
            // @ts-ignore
            detectedPlanes.forEach((plane) => {
    
                if ( this.planesAdded.has( plane ) ) return;
                
                this.planesAdded.add( plane );
                
                const frame = (this.renderer.xr as any).getFrame();
                const planePose = frame.getPose( plane.planeSpace, referenceSpace );
                const polygon = plane.polygon;
    
                let minX = Number.MAX_SAFE_INTEGER;
                let maxX = Number.MIN_SAFE_INTEGER;
                let minZ = Number.MAX_SAFE_INTEGER;
                let maxZ = Number.MIN_SAFE_INTEGER;
    
                polygon.forEach( (point: { x: number; z: number; }) => {
    
                    minX = Math.min( minX, point.x );
                    maxX = Math.max( maxX, point.x );
                    minZ = Math.min( minZ, point.z );
                    maxZ = Math.max( maxZ, point.z );
    
                } );
    
                // const width = maxX - minX;
                // const height = maxZ - minZ;
    
                // const boxMesh = new THREE.Mesh(
                //     new THREE.BoxGeometry( width, 0.01, height ),
                //     new THREE.MeshBasicMaterial( { color: 0xffffff * Math.random() } )
                // );
                // boxMesh.matrixAutoUpdate = false;
                // boxMesh.matrix.fromArray( planePose.transform.matrix );
                // scene.add( boxMesh );
    
            } );
        } );
    };

    private initHitTest() {
        //
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