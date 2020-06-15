import React, { useEffect, useRef, useState } from 'react';

import * as Three from "three";


// Styles.
import "./css/Visualizer.scss";
import wood from "./images/wood.jpg";

interface PalletDimensions {
    height: number;
    width: number;
    length: number;
};

function Pallet({height, width, length}: PalletDimensions) : Three.Mesh {
    // Normalize the heights;
    let norm = Math.sqrt(width ** 2 + height ** 2 + length ** 2)
    let texture = new Three.TextureLoader().load(wood);
    let geometry = new Three.BoxGeometry(width/norm, height/norm, length/norm);
    let material = new Three.MeshBasicMaterial({ map : texture });
    let cube = new Three.Mesh(geometry, material);
    return cube;
}



function Visualizer(){
    const mount = useRef<HTMLDivElement>(null);
    const [isAnimating, setAnimating] = useState(false);
    const controls = useRef<any>(null);
    let renderScene : any;
  
    useEffect(() => {

        let width = (mount.current as HTMLDivElement).clientWidth;
        let height =  (mount.current as HTMLDivElement).clientHeight;
        let frameId : any;

        const scene = new Three.Scene();
        const camera = new Three.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new Three.WebGLRenderer({ antialias: true });

        // This will be the rectange.

        let cube = Pallet({height: 0.8, width: 8, length: 8});
        camera.position.z = 1;
        scene.add(cube);
        renderer.setClearColor('white');
        renderer.setSize(width, height);

        renderScene = () => {
            renderer.render(scene, camera);
        };

        const handleResize = () => {
            width = (mount.current as HTMLDivElement).clientWidth;
            height = (mount.current as HTMLDivElement).clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderScene();
        }

        const animate = () => {
            cube.rotation.x += 0.01
            cube.rotation.y += 0.01

            renderScene()
            frameId = window.requestAnimationFrame(animate)
        }

        const start = () => {
            if (!frameId) {
                frameId = requestAnimationFrame(animate)
            }
        }

        const stop = () => {
            cancelAnimationFrame(frameId)
            frameId = null
        }

        (mount.current as HTMLDivElement).appendChild(renderer.domElement)
        window.addEventListener('resize', handleResize)
        // start()

        controls.current = { start, stop };
        // renderScene();

        // return () => {
        //     stop();
        //     (window as any).removeEventListener('resize', handleResize)
        //     (mount.current as HTMLDivElement).removeChild(renderer.domElement)

        //     scene.remove(cube)
        //     // geometry.dispose()
        //     // material.dispose()
        // }
    }, []);

  useEffect(() => {
      // renderScene();
    
    if (isAnimating) {
      controls.current.start()
    } else {
      controls.current.stop()
    }
  }, [isAnimating])
  
  return <div className="Visualizer" ref={mount} onClick={() => setAnimating(!isAnimating)} />
}
export default Visualizer;

