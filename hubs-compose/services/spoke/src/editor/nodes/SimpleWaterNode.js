import EditorNodeMixin from "./EditorNodeMixin";
import SimpleWater from "../objects/SimpleWater";
import { DataTexture, RGBAFormat, RepeatWrapping, Texture, UnsignedByteType } from "three";

let waterNormalMap = null;

function createFallbackNormalMap() {
  // Flat normal (0.5, 0.5, 1.0) to avoid hard dependency on external assets.
  // This prevents Spoke from crashing if the normal map image is missing.
  const data = new Uint8Array([128, 128, 255, 255]);
  const texture = new DataTexture(data, 1, 1, RGBAFormat, UnsignedByteType);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export default class SimpleWaterNode extends EditorNodeMixin(SimpleWater) {
  static componentName = "simple-water";

  static nodeName = "Simple Water";

  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json);

    const {
      opacity,
      color,
      tideHeight,
      tideScale,
      tideSpeed,
      waveHeight,
      waveScale,
      waveSpeed,
      ripplesSpeed,
      ripplesScale
    } = json.components.find(c => c.name === SimpleWaterNode.componentName).props;

    node.opacity = opacity;
    node.color.set(color);
    node.tideHeight = tideHeight;
    node.tideScale.copy(tideScale);
    node.tideSpeed.copy(tideSpeed);
    node.waveHeight = waveHeight;
    node.waveScale.copy(waveScale);
    node.waveSpeed.copy(waveSpeed);
    node.ripplesSpeed = ripplesSpeed;
    node.ripplesScale = ripplesScale;

    return node;
  }

  static async load() {
    waterNormalMap = createFallbackNormalMap();
  }

  constructor(editor) {
    if (!waterNormalMap) {
      console.warn("SimpleWaterNode: water normal map was not loaded before creating a new SimpleWaterNode");
    }

    super(editor, waterNormalMap || new Texture());

    if (editor.scene) {
      this.material.envMap = editor.scene.environmentMap;
      this.material.needsUpdate = true;
    }
  }

  onUpdate(_dt, time) {
    this.update(time);
  }

  serialize() {
    return super.serialize({
      "simple-water": {
        opacity: this.opacity,
        color: this.color,
        tideHeight: this.tideHeight,
        tideScale: this.tideScale,
        tideSpeed: this.tideSpeed,
        waveHeight: this.waveHeight,
        waveScale: this.waveScale,
        waveSpeed: this.waveSpeed,
        ripplesSpeed: this.ripplesSpeed,
        ripplesScale: this.ripplesScale
      }
    });
  }

  prepareForExport() {
    super.prepareForExport();
    this.addGLTFComponent("simple-water", {
      opacity: this.opacity,
      color: this.color,
      tideHeight: this.tideHeight,
      tideScale: this.tideScale,
      tideSpeed: this.tideSpeed,
      waveHeight: this.waveHeight,
      waveScale: this.waveScale,
      waveSpeed: this.waveSpeed,
      ripplesSpeed: this.ripplesSpeed,
      ripplesScale: this.ripplesScale
    });
    this.replaceObject();
  }

  getRuntimeResourcesForStats() {
    return { meshes: [this], materials: [this.material], textures: [waterNormalMap] };
  }
}
