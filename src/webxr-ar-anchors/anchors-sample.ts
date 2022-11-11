import { BoxBufferGeometry, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, WebGLRenderer } from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;

let anchorCubes = new Map();

init();
animate();

const anchorsAdded = new Set();

function init() {

    const container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new Scene();

    camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

    const light = new HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    light.position.set( 0.5, 1, 0.25 );
    scene.add( light );

    //

    renderer = new WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    container.appendChild( renderer.domElement );

    //

    document.body.appendChild( ARButton.createButton( renderer, {
        requiredFeatures: ['anchors']
    } ) );

    async function onSelectEnd(this: any) {

        console.log('*** this', this);
        const controller = this;
        const controllerPosition = controller.position;
        const controllerRotation = new Quaternion().setFromEuler( controller.rotation );

        const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
        const persistentHandles = JSON.parse( val! ) || [];

        if ( persistentHandles.length >= 5 ) {
            while( persistentHandles.length != 0 ) {
                const handle = persistentHandles.pop();
                await renderer.xr.deleteAnchor( handle );
                localStorage.setItem( 'webxr_ar_anchors_handles', JSON.stringify( persistentHandles ) );
            }

            anchorCubes.forEach( ( cube, handle ) => {
                scene.remove( cube );
            } );

            anchorCubes = new Map();

        } else {
            const uuid = await renderer.xr.createAnchor( controllerPosition, controllerRotation, true );
            persistentHandles.push( uuid );
            localStorage.setItem( 'webxr_ar_anchors_handles', JSON.stringify(persistentHandles) );
        }
    }

    const controller0 = renderer.xr.getController( 0 );
    controller0.addEventListener( 'selectend', onSelectEnd.bind(controller0) );
    scene.add( controller0 );

    const controller1 = renderer.xr.getController( 1 );
    controller1.addEventListener( 'selectend', onSelectEnd.bind(controller1) );
    scene.add( controller1 );

    //

    window.addEventListener( 'resize', onWindowResize );

    renderer.xr.addEventListener( 'sessionstart', function () {

        camera.position.set( 0, 0, 0 );

        const val = localStorage.getItem( 'webxr_ar_anchors_handles' );
        const persistentHandles = JSON.parse( val! ) || [];

        for (const uuid of persistentHandles) {
            renderer.xr.restoreAnchor( uuid );
        }
    } );

    renderer.xr.addEventListener( 'anchoradded', function (e) {
        console.log( "anchor added", e.data )
    } );

    renderer.xr.addEventListener( 'anchorremoved', function (e) {
        console.log( "anchor removed", e.data )
    } );

    renderer.xr.addEventListener( 'anchorposechanged', function (e) {
        const { anchor, pose } = e.data;
        const anchorCube = anchorCubes.get( anchor );
        if ( pose ) {
            anchorCube.visible = true;
            anchorCube.matrix.fromArray( pose.transform.matrix );
        } else {
            anchorCube.visible = false;
        }
    } );

    renderer.xr.addEventListener( 'anchorsdetected', function (e) {
        const detectedAnchors = e.data;
        const referenceSpace = renderer.xr.getReferenceSpace();

        console.log( `Detected ${detectedAnchors.size} anchors` );

        detectedAnchors.forEach( anchor => {
            if ( anchorsAdded.has( anchor ) ) return;

            anchorsAdded.add( anchor );
            const frame = renderer.xr.getFrame();
            const anchorPose = frame.getPose( anchor.anchorSpace, referenceSpace );

            const boxMesh = new Mesh(
                new BoxBufferGeometry( 0.075, 0.075, 0.075 ),
                new MeshBasicMaterial( { color: 0xffffff * Math.random() } )
            );
            boxMesh.matrixAutoUpdate = false;
            boxMesh.matrix.fromArray( anchorPose.transform.matrix );
            scene.add( boxMesh );
            anchorCubes.set( anchor, boxMesh );
        } );
    } );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

//

function animate() {
    renderer.setAnimationLoop( render );
}

function render() {
    renderer.render( scene, camera );
}