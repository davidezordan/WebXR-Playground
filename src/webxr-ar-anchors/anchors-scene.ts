import { BoxBufferGeometry, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, WebGLRenderer } from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

export class AnchorsScene {
    private renderer;
    private scene;
    private camera;
    private anchorCubes = new Map();
    private anchorsAdded = new Set();
    private controller0;
    private controller1;

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
            requiredFeatures: ['anchors']
        } ) );

        this.controller0 = this.renderer.xr.getController( 0 );
        this.scene.add( this.controller0 );

        this.controller1 = this.renderer.xr.getController( 1 );
        this.scene.add( this.controller1 );

        this.handleControllerEvents(this.controller0);
        this.handleControllerEvents(this.controller1);

        window.addEventListener( 'resize', this.onWindowResize );

        this.renderer.xr.addEventListener( 'sessionstart', () => {

            this.camera.position.set( 0, 0, 0 );

            const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
            const persistentHandles = JSON.parse( val! ) || [];

            for (const uuid of persistentHandles) {
                this.renderer.xr.restoreAnchor( uuid );
            }
        } );

        this.renderer.xr.addEventListener( 'anchoradded', (e) => {
            console.log( "anchor added", e.data )
        } );

        this.renderer.xr.addEventListener( 'anchorremoved', (e) => {
            console.log( "anchor removed", e.data )
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

        this.renderer.xr.addEventListener( 'anchorsdetected', (e) => {
            const detectedAnchors = e.data;
            const referenceSpace = this.renderer.xr.getReferenceSpace();

            // console.log( `Detected ${detectedAnchors.size} anchors` );

            detectedAnchors.forEach( anchor => {
                if ( this.anchorsAdded.has( anchor ) ) return;

                this.anchorsAdded.add( anchor );
                const frame = this.renderer.xr.getFrame();
                const anchorPose = frame.getPose( anchor.anchorSpace, referenceSpace );

                const boxMesh = new Mesh(
                    new BoxBufferGeometry( 0.075, 0.075, 0.075 ),
                    new MeshBasicMaterial( { color: 0xffffff * Math.random() } )
                );
                boxMesh.matrixAutoUpdate = false;
                boxMesh.matrix.fromArray( anchorPose.transform.matrix );
                this.scene.add( boxMesh );
                this.anchorCubes.set( anchor, boxMesh );
            } );
        } );
    }   

    private handleControllerEvents(controller: Group) {
        controller.addEventListener('selectend', async (event: any) => {
            const controllerPosition = controller.position;
            const controllerRotation = new Quaternion().setFromEuler( controller.rotation );

            // if (event.data.handedness === 'right') {
            //     console.log('right hand detected');
            //     this.rightJoints = (hand as any).joints;
            // }

            const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
            const persistentHandles = JSON.parse( val! ) || [];

            if ( persistentHandles.length >= 5 ) {
                while( persistentHandles.length != 0 ) {
                    const handle = persistentHandles.pop();
                    await this.renderer.xr.deleteAnchor( handle );
                    localStorage.setItem( 'webxr_ar_anchors_handles', JSON.stringify( persistentHandles ) );
                }

                this.anchorCubes.forEach( ( cube, handle ) => {
                    this.scene.remove( cube );
                } );

                this.anchorCubes = new Map();

            } else {
                const uuid = await this.renderer.xr.createAnchor( controllerPosition, controllerRotation, true );
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

    private render = () => {
        this.renderer.render( this.scene, this.camera );
    }
}