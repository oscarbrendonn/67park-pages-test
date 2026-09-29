import * as THREE from 'three';

const TARGET='8_PARK_PATIKA_UST';
const ROAD_TARGET='5_YOL';
const SEAM_TARGETS=['6_BORDUR','7_KALDIRIM_TABANI'];
const DRY_SHORE_TARGET='4_KURU_IC_ZEMIN_KIYI_EGIMI';
const GEOMETRY_TARGETS=[TARGET,ROAD_TARGET,...SEAM_TARGETS,DRY_SHORE_TARGET];
const WATER_TARGETS=['9_GOLET_SU','67D_REF_MAIN_WATER_CAP','67D_REF_MAIN_WATER_NECK_CAP'];

function hashBuffer(buffer){
  let hash=2166136261;
  for(const value of new Uint8Array(buffer)){
    hash^=value;
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

function geometryHash(geometry){
  let hash=2166136261;
  for(const array of [
    geometry.attributes.position.array,
    geometry.attributes.normal.array,
    geometry.index?.array??new Uint32Array(0),
  ]){
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    for(const value of bytes){hash^=value;hash=Math.imul(hash,16777619);}
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}

function onlyMesh(root,name){
  const matches=[];
  root.traverse(object=>{if(object.isMesh&&object.name===name)matches.push(object);});
  if(matches.length!==1)throw Error('park pond65: missing/duplicate '+name);
  return matches[0];
}

function sameMatrix(actual,expected){
  return Array.isArray(expected)&&expected.length===16&&
    expected.every((value,index)=>Number.isFinite(value)&&Math.abs(value-actual.elements[index])<=1e-8);
}

function cloneHiddenMaterial(material){
  const clone=material.clone();
  clone.name=(material.name||material.type)+'__parkPond65CollisionOnly';
  clone.visible=false;
  clone.userData={...clone.userData,parkPond65CollisionOnly:true};
  return clone;
}

export function applyParkPond65(root,meta,buffer){
  if(meta?.version!==65||meta.revision!=='P8'||!['codex','kimi'].includes(meta.variant)||
     !(buffer instanceof ArrayBuffer)||buffer.byteLength!==meta.byteLength||
     hashBuffer(buffer)!==meta.bufferHash){
    throw Error('park pond65: manifest/binary');
  }
  const prior=root.userData.parkPond65;
  if(prior){
    if(prior.patchId!==meta.patchId||prior.variant!==meta.variant)throw Error('park pond65: another patch');
    return prior;
  }
  if(!Array.isArray(meta.meshes)||meta.meshes.length!==GEOMETRY_TARGETS.length||
     GEOMETRY_TARGETS.some((name,index)=>meta.meshes[index]?.name!==name)||
     meta.policy?.walkWidth!==4.5||meta.policy?.westGapAfter!==0||
     meta.policy?.orphanSliverRemoved!==true||
     meta.policy?.upperBridgeHasNoPathUnderDeck!==true||
     meta.policy?.lowerBridgeHasNoPathUnderDeck!==true||
     meta.policy?.bridgeApproachesMeetDeckEndsWithoutVisibleGap!==true||
     meta.policy?.bridgeAxialHiddenOverlap!==0.03||
     meta.policy?.bridgeSideClearance?.['upper-bridge']!==0.9||
     meta.policy?.bridgeSideClearance?.['lower-bridge']!==0.15||
     meta.policy?.waterSkinRenderOnly!==true||meta.policy?.waterCollision!==false||
     meta.policy?.pathMaterialMutation!==false||
     meta.policy?.upperPondPathCurbShoulder!==true||
     meta.policy?.upperPondPathWallTrianglesRemoved!==70||
     meta.policy?.upperPondShoulderTriangles!==70||
     meta.policy?.upperPondShoulderCollision!==true||
     meta.policy?.upperPondShoulderSamePathMesh!==true||
     meta.policy?.upperPondShoulderAddedDrawCalls!==0||
     meta.policy?.upperPondHiddenClosureTriangles!==70||
     meta.policy?.upperPondEndpointCapTriangles!==2||
     meta.policy?.upperPondShoulderClosedWedge!==true||
     meta.policy?.upperPondShoulderOpenBoundaryEdges!==0||
     meta.policy?.upperPondShoulderNonmanifoldEdges!==0||
     meta.policy?.upperPondShoulderOrientationConflictEdges!==0||
     meta.policy?.upperPondOpposedPathCurbWallPairsRemaining!==0||
     !(meta.policy?.upperPondShoulderMaximumHiddenClosureGapMetres>=0)||
     meta.policy.upperPondShoulderMaximumHiddenClosureGapMetres>=.001||
     meta.policy?.roadUnderBothBridgeDecksRemoved!==true||
     meta.policy?.roadBridgeClipSameMesh!==true||
     meta.policy?.roadBridgeClipMaterialMutation!==false||
     meta.policy?.roadBridgeClipMatrixMutation!==false||
     meta.policy?.roadBridgeClipTerrainReferencePreserved!==true||
     meta.policy?.roadBridgeClipAddedDrawCalls!==0||
     meta.policy?.roadBridgeAxialHiddenOverlap!==.03||
     meta.policy?.roadBridgeSideClearance?.['upper-bridge']!==.9||
     meta.policy?.roadBridgeSideClearance?.['lower-bridge']!==.15||
     meta.policy?.upperPondRoadCurbShoulder!==true||
     meta.policy?.upperPondRoadWallTrianglesRemoved!==178||
     meta.policy?.upperPondRoadShoulderTriangles!==178||
     meta.policy?.upperPondRoadHiddenClosureTriangles!==178||
     meta.policy?.upperPondRoadEndpointCapTriangles!==2||
     meta.policy?.upperPondRoadShoulderCollision!==true||
     meta.policy?.upperPondRoadShoulderSameRoadMesh!==true||
     meta.policy?.upperPondRoadShoulderAddedDrawCalls!==0||
     meta.policy?.upperPondRoadShoulderClosedWedge!==true||
     meta.policy?.upperPondRoadShoulderOpenBoundaryEdges!==0||
     meta.policy?.upperPondRoadShoulderNonmanifoldEdges!==0||
     meta.policy?.upperPondRoadShoulderOrientationConflictEdges!==0||
     meta.policy?.upperPondRoadCurbPairedSegmentsRepaired!==89||
     meta.policy?.upperPondRoadCurbTailSegmentsCoveredByPathShoulder!==35||
     meta.policy?.upperPondCurbGeometryMutationForRoadShoulder!==false||
     meta.policy?.lowerNeckRoadCurbShoulder!==true||
     meta.policy?.lowerNeckRoadWallTrianglesRemoved!==12||
     meta.policy?.lowerNeckRoadShoulderTriangles!==12||
     meta.policy?.lowerNeckRoadHiddenClosureTriangles!==12||
     meta.policy?.lowerNeckRoadEndpointCapTriangles!==2||
     meta.policy?.lowerNeckRoadShoulderCollision!==true||
     meta.policy?.lowerNeckRoadShoulderSameRoadMesh!==true||
     meta.policy?.lowerNeckRoadShoulderAddedDrawCalls!==0||
     meta.policy?.lowerNeckRoadShoulderClosedWedge!==true||
     meta.policy?.lowerNeckRoadShoulderOpenBoundaryEdges!==0||
     meta.policy?.lowerNeckRoadShoulderNonmanifoldEdges!==0||
     meta.policy?.lowerNeckRoadShoulderOrientationConflictEdges!==0||
     meta.policy?.lowerNeckRoadCurbPairedSegmentsRepaired!==6||
     meta.policy?.lowerNeckClosureAndCapNormalsPastelSmoothed!==true||
     meta.policy?.lowerNeckPastelHiddenClosureVertices!==14||
     meta.policy?.lowerNeckPastelEndpointCapVertices!==6||
     meta.policy?.lowerNeckPastelMinimumNormalY!==.96||
     meta.policy?.lowerNeckPastelNormalOnlyGeometryUnchanged!==true||
     meta.policy?.upperPondInternalWallsRemoved!==true||
     meta.policy?.upperPondSeamCapIntegratedIntoCurb!==true||
     meta.policy?.upperPondSeamCapCollision!==true||
     meta.policy?.upperPondSeamAddedDrawCalls!==0||
     meta.policy?.externalWaterFacingCurbGeometryPreserved!==true||
     meta.policy?.externalWaterFacingCurbNormalsPreserved!==false||
     meta.policy?.upperPondWaterFacingCurbNormalsPastelSmoothed!==true||
     meta.policy?.upperPondWaterFacingCurbSmoothedFaces!==1048||
     meta.policy?.upperPondWaterFacingCurbAdjustedNormals!==667||
     meta.policy?.upperPondWaterFacingCurbMinimumNormalY!==.96||
     meta.policy?.upperPondWaterFacingCurbTriangleCoverageChanged!==false||
     meta.policy?.upperPondWaterFacingCurbCollisionChanged!==false||
     meta.policy?.lowerNeckWaterFacingCurbNormalsPastelSmoothed!==true||
     meta.policy?.lowerNeckWaterFacingCurbSmoothedFaces!==198||
     meta.policy?.lowerNeckWaterFacingCurbAdjustedNormals!==537||
     meta.policy?.cumulativeWaterFacingCurbSmoothedFaces!==1246||
     meta.policy?.cumulativeWaterFacingCurbAdjustedNormals!==1204||
     meta.policy?.dryShoreSameMeshGeometryReplacement!==true||
     meta.policy?.dryShoreMaterialMutation!==false||
     meta.policy?.dryShoreMatrixMutation!==false||
     meta.policy?.dryShoreAddedDrawCalls!==0||
     meta.policy?.dryShoreVisualWaterOverlapAfter!==0||
     meta.policy?.dryShoreCollisionWaterOverlapAfter!==0||
     meta.policy?.legacyWaterMaterialsClonedThenHidden!==true||
     meta.policy?.collisionTransformMutation!==false||
     meta.policy?.visibleWaterSurfaceCount!==1||meta.policy?.totalAddedDrawCalls!==1||
     !meta.seam?.renderAndCollisionSurface||meta.seam.integratedInto!=='6_BORDUR'||
     meta.seam.triangles!==52||meta.seam.removedInternalWallTriangles?.['6_BORDUR']!==36||
     meta.seam.removedInternalWallTriangles?.['7_KALDIRIM_TABANI']!==38||
     meta.seam.internalWallFacesRemaining!==0||
     meta.seam.externalWaterFacingCurbGeometryPreserved!==true||
     meta.seam.externalWaterFacingCurbNormalsPreserved!==false||
     meta.seam.externalWaterFacingCurbNormalsPastelSmoothed!==true||
     meta.seam.externalWaterFacingCurbSmoothedFaces!==1246||
     meta.seam.externalWaterFacingCurbAdjustedNormals!==1204||
     meta.seam.lowerNeckWaterFacingCurbSmoothedFaces!==198||
     meta.seam.lowerNeckWaterFacingCurbAdjustedNormals!==537||
     meta.seam.externalWaterFacingCurbMinimumNormalY!==.96||
     Math.abs(meta.seam.worldY-9.380085642765637)>1e-9||
     Math.abs(meta.seam.halfWidthMetres-.06)>1e-12||
     meta.seam.packedCorridorCoverageResidualAreaSquareMetres>=1e-5||
     meta.seam.packedCapCoplanarOverlapAreaSquareMetres>=1e-5){
    throw Error('park pond65: target/policy');
  }
  const pathItem=meta.meshes[0];
  if(pathItem.role!=='path-with-upper-pond-closed-shoulder-wedge'||
     pathItem.sourceHash!=='936d551b'||pathItem.outputHash!=='7f4b62fe'||
     pathItem.sourceVertices!==70693||pathItem.sourceIndexCount!==79632||
     pathItem.vertices!==73027||pathItem.index?.count!==69828||
     pathItem.shoulderManifestSHA256!=='e382f82908654ff72a7f1a1957d932a91b8ec3939876a2e48984a373ed27ed85'||
     pathItem.removedPathCurbWallFaceStarts?.count!==70||
     pathItem.shoulder?.sourceVertices!==72877||
     pathItem.shoulder?.sourceTriangles!==23204||
     pathItem.shoulder?.removedPathWallTriangles!==70||
     pathItem.shoulder?.addedShoulderVertices!==72||
     pathItem.shoulder?.addedShoulderTriangles!==70||
     pathItem.shoulder?.addedHiddenClosureVertices!==72||
     pathItem.shoulder?.addedHiddenClosureTriangles!==70||
     pathItem.shoulder?.addedEndpointCapVertices!==6||
     pathItem.shoulder?.addedEndpointCapTriangles!==2||
     pathItem.shoulder?.totalAddedVertices!==150||
     pathItem.shoulder?.totalAddedTriangles!==142||
     pathItem.shoulder?.resultVertices!==73027||
     pathItem.shoulder?.resultTriangles!==23276||
     pathItem.shoulder?.generatedWrongWindingTriangles!==0||
     pathItem.shoulder?.duplicateTriangles!==0||
     pathItem.shoulder?.closedWedge!==true||
     pathItem.shoulder?.openBoundaryEdges!==0||
     pathItem.shoulder?.nonmanifoldEdges!==0||
     pathItem.shoulder?.orientationConflictEdges!==0||
     pathItem.shoulder?.degenerateTriangles!==0||
     pathItem.shoulder?.opposedPathCurbWallPairsRemaining!==0||
     pathItem.shoulder?.externalWaterFacingCurbGeometryAndNormalsUnchanged!==true||
     pathItem.shoulder?.sameMeshMaterialMatrixTerrainReference!==true||
     pathItem.shoulder?.addedMeshes!==0||pathItem.shoulder?.addedMaterials!==0||
     pathItem.shoulder?.addedDrawCalls!==0||
     !(pathItem.shoulder?.minimumGeneratedTriangleAltitudeMetres>5e-6)||
     !(pathItem.shoulder?.minimumGeneratedTriangleCrossY>0)||
     !(pathItem.shoulder?.maximumHiddenLowerClosureSeparationMetres>=0)||
     pathItem.shoulder.maximumHiddenLowerClosureSeparationMetres>=.001){
    throw Error('park pond65: upper pond shoulder policy');
  }
  const roadItem=meta.meshes[1];
  if(roadItem.role!=='road-solid-clipped-beneath-bridge-decks-with-upper-pond-and-lower-neck-closed-shoulder-wedges'||
     roadItem.sourceHash!=='fbccb9d5'||roadItem.sourceVertices!==58981||
     roadItem.sourceIndexCount!==99204||roadItem.vertices!==60095||
     roadItem.index?.count!==96918||roadItem.outputHash!=='126008ea'||
     roadItem.p4OutputHash!=='d6c19f65'||roadItem.sameMesh!==true||
     roadItem.sameMaterial!==true||roadItem.sameMatrix!==true||
     roadItem.sameTerrainSamplerReference!==true||roadItem.renderOnly!==false||
     roadItem.collision!==true||roadItem.stats?.resultNonmanifoldEdges!==0||
     roadItem.stats?.resultOpposedEdges!==0||roadItem.stats?.p4RemovedSourceTriangles!==1194||
     roadItem.stats?.removedSourceTriangles!==1384||roadItem.stats?.retainedSourceTriangles!==31684||
     roadItem.stats?.p4AddedTriangles!==238||roadItem.stats?.postP4RoadWallTrianglesRemoved!==178||
     roadItem.stats?.postP4ClosedWedgeTrianglesAdded!==358||
     roadItem.stats?.postP6RoadWallTrianglesRemoved!==12||
     roadItem.stats?.postP6ClosedWedgeTrianglesAdded!==26||roadItem.stats?.addedTriangles!==622||
     roadItem.stats?.netTrianglesVsOriginal!==-762||
     roadItem.removedUpperRimWallFaceStarts?.count!==178||
     roadItem.removedLowerNeckWallFaceStarts?.count!==12||
     roadItem.upperRimManifestSHA256!=='a1cc13a09cc54ba8cfab31a077b1b1ac148148097f44a1c0873c432f0d95aa5c'||
     roadItem.upperRim?.sourceOutputHash!=='d6c19f65'||
     roadItem.upperRim?.sourceVertices!==59695||roadItem.upperRim?.sourceTriangles!==32112||
     roadItem.upperRim?.removedRoadWallTriangles!==178||
     roadItem.upperRim?.addedShoulderVertices!==180||roadItem.upperRim?.addedShoulderTriangles!==178||
     roadItem.upperRim?.addedHiddenClosureVertices!==180||roadItem.upperRim?.addedHiddenClosureTriangles!==178||
     roadItem.upperRim?.addedEndpointCapVertices!==6||roadItem.upperRim?.addedEndpointCapTriangles!==2||
     roadItem.upperRim?.totalAddedVertices!==366||roadItem.upperRim?.totalAddedTriangles!==358||
     roadItem.upperRim?.netTriangleDelta!==180||roadItem.upperRim?.resultVertices!==60061||
     roadItem.upperRim?.resultTriangles!==32292||roadItem.upperRim?.closedWedge!==true||
     roadItem.upperRim?.openBoundaryEdges!==0||roadItem.upperRim?.nonmanifoldEdges!==0||
     roadItem.upperRim?.orientationConflictEdges!==0||roadItem.upperRim?.duplicateTriangles!==0||
     roadItem.upperRim?.degenerateTriangles!==0||roadItem.upperRim?.fineTopology?.openBoundaryEdges!==0||
     roadItem.upperRim?.fineTopology?.nonmanifoldEdges!==0||
     roadItem.upperRim?.fineTopology?.orientationConflictEdges!==0||
     roadItem.upperRim?.fineTopology?.duplicateTriangles!==0||
     roadItem.upperRim?.fineTopology?.degenerateTriangles!==0||
     roadItem.upperRim?.sameMeshMaterialMatrixTerrainReference!==true||
     roadItem.upperRim?.addedDrawCalls!==0||
     !(roadItem.upperRim?.minimumGeneratedTriangleAltitudeMetres>5e-6)||
     !(roadItem.upperRim?.minimumVisibleShoulderCrossY>0)||
     roadItem.upperRim?.visibleShoulderProjectedOverlapSquareMetres>=1e-8||
     roadItem.upperRim?.maximumPackedWorldRoundTripMetres>=1e-5||
     roadItem.lowerNeckManifestSHA256!=='142346815251824a1ffa2c3714cc35ecc0bf9147e7f2bc874622290a39bad164'||
     roadItem.lowerNeck?.sourceOutputHash!=='0f58d29d'||
     roadItem.lowerNeck?.sourceVertices!==60061||roadItem.lowerNeck?.sourceTriangles!==32292||
     roadItem.lowerNeck?.repairedSegments!==6||roadItem.lowerNeck?.removedRoadWallTriangles!==12||
     roadItem.lowerNeck?.addedShoulderVertices!==14||roadItem.lowerNeck?.addedShoulderTriangles!==12||
     roadItem.lowerNeck?.addedHiddenClosureVertices!==14||roadItem.lowerNeck?.addedHiddenClosureTriangles!==12||
     roadItem.lowerNeck?.addedEndpointCapVertices!==6||roadItem.lowerNeck?.addedEndpointCapTriangles!==2||
     roadItem.lowerNeck?.pastelBiasedHiddenClosureVertices!==14||
     roadItem.lowerNeck?.pastelBiasedEndpointCapVertices!==6||
     roadItem.lowerNeck?.pastelMinimumNormalY!==.96||
     roadItem.lowerNeck?.pastelNormalOnlyGeometryUnchanged!==true||
     roadItem.lowerNeck?.totalAddedVertices!==34||roadItem.lowerNeck?.totalAddedTriangles!==26||
     roadItem.lowerNeck?.netTriangleDelta!==14||roadItem.lowerNeck?.resultVertices!==60095||
     roadItem.lowerNeck?.resultTriangles!==32306||roadItem.lowerNeck?.closedWedge!==true||
     roadItem.lowerNeck?.openBoundaryEdges!==0||roadItem.lowerNeck?.nonmanifoldEdges!==0||
     roadItem.lowerNeck?.orientationConflictEdges!==0||roadItem.lowerNeck?.duplicateTriangles!==0||
     roadItem.lowerNeck?.degenerateTriangles!==0||roadItem.lowerNeck?.fineTopology?.openBoundaryEdges!==0||
     roadItem.lowerNeck?.fineTopology?.nonmanifoldEdges!==0||
     roadItem.lowerNeck?.fineTopology?.orientationConflictEdges!==0||
     roadItem.lowerNeck?.fineTopology?.duplicateTriangles!==0||
     roadItem.lowerNeck?.fineTopology?.degenerateTriangles!==0||
     roadItem.lowerNeck?.sameMeshMaterialMatrixTerrainReference!==true||
     roadItem.lowerNeck?.addedDrawCalls!==0||
     !(roadItem.lowerNeck?.minimumGeneratedTriangleAltitudeMetres>5e-6)||
     !(roadItem.lowerNeck?.minimumVisibleShoulderCrossY>0)||
     roadItem.lowerNeck?.visibleShoulderProjectedOverlapSquareMetres>=1e-8||
     roadItem.lowerNeck?.maximumPackedWorldRoundTripMetres>=1e-5||
     roadItem.axialInsetMetres!==.03||
     roadItem.cutterOverlapMetres!==.0001||
     roadItem.sideClearanceMetres?.['upper-bridge']!==.9||
     roadItem.sideClearanceMetres?.['lower-bridge']!==.15||
     Math.abs(roadItem.nominalTopAreaRemovedSquareMetres-21.53622180323666)>1e-9){
    throw Error('park pond65: bridge road policy');
  }
  const curbItem=meta.meshes[2];
  const expectedCurb=meta.variant==='codex'
    ? {sourceHash:'719102c4',sourceVertices:54885,sourceIndexCount:173490,vertices:56296,indexCount:173538,outputHash:'c14b04b5'}
    : {sourceHash:'5c959641',sourceVertices:55057,sourceIndexCount:173958,vertices:56468,indexCount:174006,outputHash:'5dff4ae7'};
  const curbSmoothing=curbItem.stats?.upperPondWaterWallSmoothing;
  const lowerNeckCurbSmoothing=curbItem.stats?.lowerNeckWaterWallSmoothing;
  const cumulativeCurbSmoothing=curbItem.stats?.cumulativePastelSmoothing;
  if(curbItem.role!=='curb-with-integrated-seam-cap-and-pastel-upper-and-lower-neck-water-profiles'||
     curbItem.sourceHash!==expectedCurb.sourceHash||curbItem.sourceVertices!==expectedCurb.sourceVertices||
     curbItem.sourceIndexCount!==expectedCurb.sourceIndexCount||curbItem.vertices!==expectedCurb.vertices||
     curbItem.index?.count!==expectedCurb.indexCount||curbItem.outputHash!==expectedCurb.outputHash||
     curbItem.smoothedLowerNeckFaceStarts?.count!==198||
     curbItem.stats?.removedInternalWallTriangles!==36||curbItem.stats?.addedCapTriangles!==52||
     curbSmoothing?.waterFacingFaces!==1048||curbSmoothing?.duplicatedVertices!==800||
     curbSmoothing?.adjustedNormals!==667||curbSmoothing?.minimumNormalY!==.96||
     curbSmoothing?.positionsChanged!==false||curbSmoothing?.triangleCoverageChanged!==false||
     curbSmoothing?.materialChanged!==false||curbSmoothing?.collisionChanged!==false||
     curbSmoothing?.remappedIndexCorners!==3144||curbSmoothing?.sameTrianglePositions!==true||
     curbSmoothing?.sameWeldedTopology!==true||
     JSON.stringify(curbSmoothing?.afterTopology)!==JSON.stringify(curbSmoothing?.beforeTopology)||
     JSON.stringify(curbSmoothing?.fineTopology)!==JSON.stringify(curbSmoothing?.fineBeforeTopology)||
     curbSmoothing?.sameMeshMaterialMatrixTerrainReference!==true||curbSmoothing?.addedDrawCalls!==0||
     lowerNeckCurbSmoothing?.sourceOutputHash!==(meta.variant==='codex'?'cacca7f0':'a38c5a5e')||
     lowerNeckCurbSmoothing?.endpointSmoothedFaces!==198||
     lowerNeckCurbSmoothing?.endpointDuplicatedVertices!==554||
     lowerNeckCurbSmoothing?.endpointAdjustedNormals!==537||
     lowerNeckCurbSmoothing?.endpointRemappedIndexCorners!==594||
     lowerNeckCurbSmoothing?.sameTrianglePositions!==true||
     lowerNeckCurbSmoothing?.sameWeldedTopology!==true||
     JSON.stringify(lowerNeckCurbSmoothing?.afterTopology)!==JSON.stringify(lowerNeckCurbSmoothing?.beforeTopology)||
     JSON.stringify(lowerNeckCurbSmoothing?.fineTopology)!==JSON.stringify(lowerNeckCurbSmoothing?.fineBeforeTopology)||
     lowerNeckCurbSmoothing?.sameMeshMaterialMatrixTerrainReference!==true||
     lowerNeckCurbSmoothing?.addedDrawCalls!==0||
     cumulativeCurbSmoothing?.waterFacingFaces!==1246||
     cumulativeCurbSmoothing?.duplicatedVertices!==1354||
     cumulativeCurbSmoothing?.adjustedNormals!==1204||
     cumulativeCurbSmoothing?.minimumNormalY!==.96||
     cumulativeCurbSmoothing?.positionsChanged!==false||
     cumulativeCurbSmoothing?.triangleCoverageChanged!==false||
     cumulativeCurbSmoothing?.materialChanged!==false||
     cumulativeCurbSmoothing?.collisionChanged!==false){
    throw Error('park pond65: upper pond curb smoothing policy');
  }
  const dryItem=meta.meshes[4];
  if(dryItem.role!=='dry-shore-visual-and-collision-replacement'||
     dryItem.sourceHash!=='38aeb06d'||dryItem.outputHash!=='96b1ff87'||
     dryItem.sourceVertices!==10602||dryItem.sourceIndexCount!==47562||
     dryItem.vertices!==14340||dryItem.triangles!==16444||
     dryItem.sameMesh!==true||dryItem.sameMaterial!==true||dryItem.sameMatrix!==true||
     dryItem.sameTerrainSamplerReference!==true||dryItem.renderOnly!==false||dryItem.collision!==true||
     dryItem.visiblePlanOverlapAfter!==0||dryItem.collisionPlanOverlapAfter!==0||
     Math.abs(dryItem.clipClearanceMetres-.0001)>1e-12){
    throw Error('park pond65: dry shore policy');
  }
  const read=(descriptor,Type)=>{
    if(!descriptor||!Number.isSafeInteger(descriptor.byteOffset)||!Number.isSafeInteger(descriptor.count)||
       descriptor.byteOffset<0||descriptor.count<0||descriptor.byteOffset%4||
       descriptor.byteOffset+descriptor.count*4>buffer.byteLength){
      throw Error('park pond65: binary range');
    }
    return new Type(buffer,descriptor.byteOffset,descriptor.count);
  };
  const buildGeometry=item=>{
    const positions=read(item.positions,Float32Array);
    const normals=read(item.normals,Float32Array);
    const index=read(item.index,Uint32Array);
    if(positions.length!==item.vertices*3||normals.length!==positions.length||index.length%3||
       !positions.every(Number.isFinite)||!index.every(id=>id<item.vertices)){
      throw Error('park pond65: geometry shape '+item.name);
    }
    for(let offset=0;offset<normals.length;offset+=3){
      if(Math.abs(Math.hypot(normals[offset],normals[offset+1],normals[offset+2])-1)>.002){
        throw Error('park pond65: geometry normal '+item.name);
      }
    }
    if(item.name===DRY_SHORE_TARGET||item.name===ROAD_TARGET){
      const generatedFaces=new Set();
      const itemWorld=new THREE.Matrix4().fromArray(item.matrixWorld);
      const worldA=new THREE.Vector3(),worldB=new THREE.Vector3(),worldC=new THREE.Vector3();
      const worldAB=new THREE.Vector3(),worldAC=new THREE.Vector3(),worldBC=new THREE.Vector3();
      for(let offset=0;offset<index.length;offset+=3){
        const ids=[index[offset],index[offset+1],index[offset+2]];
        if(!ids.some(id=>id>=item.sourceVertices))continue;
        const key=[...ids].sort((a,b)=>a-b).join(',');
        if(generatedFaces.has(key))throw Error('park pond65: dry shore duplicate triangle');
        generatedFaces.add(key);
        const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
        const abx=positions[b]-positions[a],aby=positions[b+1]-positions[a+1],abz=positions[b+2]-positions[a+2];
        const acx=positions[c]-positions[a],acy=positions[c+1]-positions[a+1],acz=positions[c+2]-positions[a+2];
        const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
        worldA.set(positions[a],positions[a+1],positions[a+2]).applyMatrix4(itemWorld);
        worldB.set(positions[b],positions[b+1],positions[b+2]).applyMatrix4(itemWorld);
        worldC.set(positions[c],positions[c+1],positions[c+2]).applyMatrix4(itemWorld);
        worldAB.subVectors(worldB,worldA);worldAC.subVectors(worldC,worldA);worldBC.subVectors(worldC,worldB);
        const worldArea2=new THREE.Vector3().crossVectors(worldAB,worldAC).length();
        const worldMaxEdge=Math.max(worldAB.length(),worldAC.length(),worldBC.length());
        const worldMinAltitude=worldMaxEdge?worldArea2/worldMaxEdge:0;
        const anx=normals[a]+normals[b]+normals[c];
        const any=normals[a+1]+normals[b+1]+normals[c+1];
        const anz=normals[a+2]+normals[b+2]+normals[c+2];
        if(!Number.isFinite(worldMinAltitude)||worldMinAltitude<=5e-6||nx*anx+ny*any+nz*anz<=0){
          throw Error('park pond65: generated winding '+item.name);
        }
      }
      if(!generatedFaces.size)throw Error('park pond65: generated faces '+item.name);
    }
    if(item.name===ROAD_TARGET){
      const itemWorld=new THREE.Matrix4().fromArray(item.matrixWorld);
      const validateWedge=(stats,endVertex,label)=>{
        const firstVertex=stats.sourceVertices;
        const firstClosureVertex=firstVertex+stats.addedShoulderVertices;
        const firstEndpointVertex=firstClosureVertex+stats.addedHiddenClosureVertices;
        const faces=new Set();
        const worldA=new THREE.Vector3(),worldB=new THREE.Vector3(),worldC=new THREE.Vector3();
        const worldAB=new THREE.Vector3(),worldAC=new THREE.Vector3(),worldBC=new THREE.Vector3();
        let visibleFaces=0,closureFaces=0,endpointFaces=0;
        let minimumAltitude=Infinity,minimumVisibleCrossY=Infinity;
        for(let offset=0;offset<index.length;offset+=3){
          const ids=[index[offset],index[offset+1],index[offset+2]];
          if(ids.every(id=>id<firstVertex)||ids.every(id=>id>=endVertex))continue;
          if(!ids.every(id=>id>=firstVertex&&id<endVertex))throw Error('park pond65: mixed '+label+' triangle');
          const key=[...ids].sort((a,b)=>a-b).join(',');
          if(faces.has(key))throw Error('park pond65: duplicate '+label+' triangle');
          faces.add(key);
          const visible=ids.every(id=>id<firstClosureVertex);
          const closure=ids.every(id=>id>=firstClosureVertex&&id<firstEndpointVertex);
          const endpoint=ids.every(id=>id>=firstEndpointVertex&&id<endVertex);
          if(Number(visible)+Number(closure)+Number(endpoint)!==1){
            throw Error('park pond65: '+label+' face partition');
          }
          if(visible){
            visibleFaces++;
            for(const id of ids){
              const base=id*3;
              if(normals[base]!==0||normals[base+1]!==1||normals[base+2]!==0){
                throw Error('park pond65: visible '+label+' normal');
              }
            }
          }else if(closure)closureFaces++;
          else endpointFaces++;
          const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
          worldA.set(positions[a],positions[a+1],positions[a+2]).applyMatrix4(itemWorld);
          worldB.set(positions[b],positions[b+1],positions[b+2]).applyMatrix4(itemWorld);
          worldC.set(positions[c],positions[c+1],positions[c+2]).applyMatrix4(itemWorld);
          worldAB.subVectors(worldB,worldA);worldAC.subVectors(worldC,worldA);worldBC.subVectors(worldC,worldB);
          const cross=new THREE.Vector3().crossVectors(worldAB,worldAC);
          const maxEdge=Math.max(worldAB.length(),worldAC.length(),worldBC.length());
          const altitude=maxEdge?cross.length()/maxEdge:0;
          minimumAltitude=Math.min(minimumAltitude,altitude);
          if(visible)minimumVisibleCrossY=Math.min(minimumVisibleCrossY,cross.y);
          const averageNormal=new THREE.Vector3();
          for(const id of ids){
            const base=id*3;
            averageNormal.x+=normals[base];
            averageNormal.y+=normals[base+1];
            averageNormal.z+=normals[base+2];
          }
          if(cross.dot(averageNormal)<=0)throw Error('park pond65: '+label+' winding');
        }
        if(faces.size!==stats.totalAddedTriangles||visibleFaces!==stats.addedShoulderTriangles||
           closureFaces!==stats.addedHiddenClosureTriangles||endpointFaces!==stats.addedEndpointCapTriangles||
           minimumAltitude<=5e-6||minimumVisibleCrossY<=0){
          throw Error('park pond65: '+label+' geometry');
        }
      };
      validateWedge(item.upperRim,item.lowerNeck.sourceVertices,'upper pond road shoulder');
      validateWedge(item.lowerNeck,item.vertices,'lower neck road shoulder');
      const firstPastelClosureVertex=item.lowerNeck.sourceVertices+item.lowerNeck.addedShoulderVertices;
      for(let id=firstPastelClosureVertex;id<item.vertices;id++){
        if(normals[id*3+1]<.95999){
          throw Error('park pond65: lower neck closure/cap pastel normal');
        }
      }
    }
    if(item.name==='6_BORDUR'){
      const firstSmoothedVertex=item.stats.upperPondWaterWallSmoothing.sourceVertices;
      const smoothedVertices=item.stats.cumulativePastelSmoothing.duplicatedVertices;
      if(firstSmoothedVertex+smoothedVertices!==item.vertices){
        throw Error('park pond65: curb smoothing vertex range');
      }
      for(let id=firstSmoothedVertex;id<item.vertices;id++){
        const base=id*3;
        if(normals[base+1]<.95999){
          throw Error('park pond65: curb smoothing normal');
        }
      }
    }
    if(item.name===TARGET){
      const firstShoulderVertex=item.shoulder.sourceVertices;
      const firstClosureVertex=firstShoulderVertex+item.shoulder.addedShoulderVertices;
      const firstEndpointVertex=firstClosureVertex+item.shoulder.addedHiddenClosureVertices;
      const shoulderFaces=new Set();
      const itemWorld=new THREE.Matrix4().fromArray(item.matrixWorld);
      const worldA=new THREE.Vector3(),worldB=new THREE.Vector3(),worldC=new THREE.Vector3();
      const worldAB=new THREE.Vector3(),worldAC=new THREE.Vector3(),worldBC=new THREE.Vector3();
      let minimumAltitude=Infinity,minimumVisibleCrossY=Infinity;
      let visibleFaces=0,closureFaces=0,endpointFaces=0;
      for(let offset=0;offset<index.length;offset+=3){
        const ids=[index[offset],index[offset+1],index[offset+2]];
        if(!ids.some(id=>id>=firstShoulderVertex))continue;
        if(!ids.every(id=>id>=firstShoulderVertex))throw Error('park pond65: mixed shoulder triangle');
        const key=[...ids].sort((a,b)=>a-b).join(',');
        if(shoulderFaces.has(key))throw Error('park pond65: duplicate shoulder triangle');
        shoulderFaces.add(key);
        const visible=ids.every(id=>id<firstClosureVertex);
        const closure=ids.every(id=>id>=firstClosureVertex&&id<firstEndpointVertex);
        const endpoint=ids.every(id=>id>=firstEndpointVertex);
        if(Number(visible)+Number(closure)+Number(endpoint)!==1){
          throw Error('park pond65: shoulder face partition');
        }
        if(visible){
          visibleFaces++;
          for(const id of ids){
            const base=id*3;
            if(normals[base]!==0||normals[base+1]!==1||normals[base+2]!==0){
              throw Error('park pond65: visible shoulder normal');
            }
          }
        }else if(closure)closureFaces++;
        else endpointFaces++;
        const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
        worldA.set(positions[a],positions[a+1],positions[a+2]).applyMatrix4(itemWorld);
        worldB.set(positions[b],positions[b+1],positions[b+2]).applyMatrix4(itemWorld);
        worldC.set(positions[c],positions[c+1],positions[c+2]).applyMatrix4(itemWorld);
        worldAB.subVectors(worldB,worldA);worldAC.subVectors(worldC,worldA);worldBC.subVectors(worldC,worldB);
        const cross=new THREE.Vector3().crossVectors(worldAB,worldAC);
        const maxEdge=Math.max(worldAB.length(),worldAC.length(),worldBC.length());
        const altitude=maxEdge?cross.length()/maxEdge:0;
        minimumAltitude=Math.min(minimumAltitude,altitude);
        if(visible)minimumVisibleCrossY=Math.min(minimumVisibleCrossY,cross.y);
        const aNormal=ids[0]*3,bNormal=ids[1]*3,cNormal=ids[2]*3;
        const averageNormal=new THREE.Vector3(
          normals[aNormal]+normals[bNormal]+normals[cNormal],
          normals[aNormal+1]+normals[bNormal+1]+normals[cNormal+1],
          normals[aNormal+2]+normals[bNormal+2]+normals[cNormal+2],
        );
        if(cross.dot(averageNormal)<=0)throw Error('park pond65: shoulder winding');
      }
      if(shoulderFaces.size!==142||visibleFaces!==70||closureFaces!==70||endpointFaces!==2||
         minimumAltitude<=5e-6||minimumVisibleCrossY<=0){
        throw Error('park pond65: upper pond shoulder geometry');
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions.slice(),3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals.slice(),3));
    geometry.setIndex(new THREE.BufferAttribute(index.slice(),1));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    if(geometryHash(geometry)!==item.outputHash)throw Error('park pond65: output hash '+item.name);
    return geometry;
  };
  root.updateMatrixWorld(true);
  if(!root.userData.roadSeal64||root.userData.roadSeal64.variant!==meta.variant){
    throw Error('park pond65: road seal source');
  }
  const replacements=[];
  for(const item of meta.meshes){
    const mesh=onlyMesh(root,item.name),oldGeometry=mesh.geometry;
    if((item.name===TARGET&&!mesh.userData.roadSeal64)||
       !sameMatrix(mesh.matrixWorld,item.matrixWorld)||
       oldGeometry.attributes.position.count!==item.sourceVertices||
       oldGeometry.index?.count!==item.sourceIndexCount||
       geometryHash(oldGeometry)!==item.sourceHash){
      throw Error('park pond65: geometry source '+item.name);
    }
    replacements.push({
      item,mesh,oldGeometry,oldPatchMarker:mesh.userData.parkPond65,
      oldMaterial:mesh.material,
      oldMatrix:mesh.matrix.clone(),
      oldMatrixWorld:mesh.matrixWorld.clone(),
      oldVisible:mesh.visible,
      oldParent:mesh.parent,
      nextGeometry:buildGeometry(item),
    });
  }

  const waterSpec=meta.water;
  if(!waterSpec?.renderOnly||waterSpec.collision!==false||waterSpec.name!=='67D_PARK_WATER_UNIFIED_V65'||
     waterSpec.materialSource!=='67D_REF_MAIN_WATER_CAP'||waterSpec.triangles!==318||
     Math.abs(waterSpec.area-1434.5487157659745)>1e-7||
     Math.abs(waterSpec.worldY-8.918882303963635)>1e-8||
     Math.abs(waterSpec.baseOnlySliverAreaExcluded-10.508383648806943)>1e-7||
     !Array.isArray(waterSpec.sources)||waterSpec.sources.length!==WATER_TARGETS.length||
     WATER_TARGETS.some(name=>waterSpec.sources.filter(source=>source.name===name).length!==1)){
    throw Error('park pond65: water policy');
  }
  if(root.getObjectByName(waterSpec.name))throw Error('park pond65: duplicate unified water');
  const prepared=[];
  for(const source of waterSpec.sources){
    const mesh=onlyMesh(root,source.name),geometry=mesh.geometry;
    if(mesh.userData.parkPond65CollisionOnly||!geometry?.attributes?.position||
       !geometry.attributes.normal||!geometry.index||
       geometry.attributes.position.count!==source.sourceVertices||
       geometry.index.count!==source.sourceIndexCount||
       geometryHash(geometry)!==source.sourceHash||
       !sameMatrix(mesh.matrixWorld,source.matrixWorld)){
      throw Error('park pond65: water source '+source.name);
    }
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    if(!materials.length||materials.some(material=>!material?.isMaterial)){
      throw Error('park pond65: water material '+source.name);
    }
    prepared.push({
      mesh,
      oldMaterial:mesh.material,
      oldGeometry:geometry,
      oldMatrix:mesh.matrix.clone(),
      oldMatrixWorld:mesh.matrixWorld.clone(),
      oldVisible:mesh.visible,
      hiddenMaterial:Array.isArray(mesh.material)
        ? materials.map(cloneHiddenMaterial)
        : cloneHiddenMaterial(materials[0]),
    });
  }
  const waterPositions=read(waterSpec.positions,Float32Array);
  const waterNormals=read(waterSpec.normals,Float32Array);
  const waterIndex=read(waterSpec.index,Uint32Array);
  if(waterPositions.length!==waterSpec.vertices*3||waterNormals.length!==waterPositions.length||
     waterIndex.length!==waterSpec.triangles*3||!waterPositions.every(Number.isFinite)||
     !waterNormals.every(Number.isFinite)||!waterIndex.every(id=>id<waterSpec.vertices)){
    throw Error('park pond65: water geometry');
  }
  for(let offset=0;offset<waterPositions.length;offset+=3){
    if(Math.abs(waterPositions[offset+1]-waterSpec.worldY)>1e-5||
       waterNormals[offset]!==0||waterNormals[offset+1]!==1||waterNormals[offset+2]!==0){
      throw Error('park pond65: water plane');
    }
  }
  for(let offset=0;offset<waterIndex.length;offset+=3){
    const a=waterIndex[offset]*3,b=waterIndex[offset+1]*3,c=waterIndex[offset+2]*3;
    const abx=waterPositions[b]-waterPositions[a],abz=waterPositions[b+2]-waterPositions[a+2];
    const acx=waterPositions[c]-waterPositions[a],acz=waterPositions[c+2]-waterPositions[a+2];
    if(abz*acx-abx*acz<=1e-9)throw Error('park pond65: water winding');
  }
  const waterGeometry=new THREE.BufferGeometry();
  waterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(waterPositions.slice(),3));
  waterGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(waterNormals.slice(),3));
  waterGeometry.setIndex(new THREE.BufferAttribute(waterIndex.slice(),1));
  waterGeometry.computeBoundingBox();waterGeometry.computeBoundingSphere();
  const paletteOwner=prepared.find(entry=>entry.mesh.name===waterSpec.materialSource);
  const paletteMaterial=Array.isArray(paletteOwner.mesh.material)
    ? paletteOwner.mesh.material[0]
    : paletteOwner.mesh.material;
  const waterMaterial=paletteMaterial.clone();
  waterMaterial.name=(paletteMaterial.name||paletteMaterial.type)+'__parkPond65Unified';
  waterMaterial.visible=true;
  waterMaterial.transparent=false;
  waterMaterial.opacity=1;
  waterMaterial.depthTest=true;
  waterMaterial.depthWrite=true;
  waterMaterial.colorWrite=true;
  waterMaterial.polygonOffset=false;
  waterMaterial.flatShading=false;
  waterMaterial.dithering=true;
  waterMaterial.userData={...waterMaterial.userData,parkPond65Unified:true};
  waterMaterial.needsUpdate=true;
  const water=new THREE.Mesh(waterGeometry,waterMaterial);
  water.name=waterSpec.name;
  water.matrixAutoUpdate=false;
  water.matrix.copy(root.matrixWorld).invert();
  water.matrixWorldNeedsUpdate=true;
  water.castShadow=false;
  water.receiveShadow=true;
  water.renderOrder=Math.max(...prepared.map(entry=>entry.mesh.renderOrder));
  water.userData.parkPond65={patchId:meta.patchId,renderOnly:true,collision:false};
  water.userData.excludeFromTerrainSampler=true;

  const restoreReplacements=()=>{
    for(const entry of replacements){
      if(entry.mesh.parent!==entry.oldParent){
        entry.mesh.removeFromParent();
        if(entry.oldParent)entry.oldParent.add(entry.mesh);
      }
      entry.mesh.geometry=entry.oldGeometry;
      entry.mesh.material=entry.oldMaterial;
      entry.mesh.matrix.copy(entry.oldMatrix);
      entry.mesh.matrixWorld.copy(entry.oldMatrixWorld);
      entry.mesh.visible=entry.oldVisible;
      if(entry.oldPatchMarker===undefined)delete entry.mesh.userData.parkPond65;
      else entry.mesh.userData.parkPond65=entry.oldPatchMarker;
    }
  };
  const disposeReplacementOutputs=()=>{
    for(const entry of replacements)entry.nextGeometry.dispose();
  };
  const rollbackWaterSources=()=>{
    for(const entry of prepared){
      entry.mesh.material=entry.oldMaterial;
      delete entry.mesh.userData.parkPond65CollisionOnly;
    }
  };

  // Commit only after every geometry, water source and binary guard passes.
  for(const entry of replacements){
    entry.mesh.geometry=entry.nextGeometry;
    entry.mesh.userData.parkPond65={
      patchId:meta.patchId,
      operation:entry.item.name===TARGET
        ? 'close-gap-clear-bridges-and-repair-upper-pond-shoulder'
        : entry.item.name===ROAD_TARGET
          ? 'clip-road-solid-beneath-both-bridge-decks-and-repair-upper-pond-and-lower-neck-rims'
        : entry.item.name===DRY_SHORE_TARGET
          ? 'clip-dry-shore-to-canonical-water-boundary'
          : 'remove-internal-wall-and-cap-upper-pond-seam',
    };
  }
  for(const entry of prepared){
    entry.mesh.material=entry.hiddenMaterial;
    entry.mesh.userData.parkPond65CollisionOnly=meta.patchId;
  }
  root.add(water);
  root.updateMatrixWorld(true);
  const identity=new THREE.Matrix4();
  const compensatedWorld=water.matrixWorld.clone();
  if(compensatedWorld.elements.some((value,index)=>Math.abs(value-identity.elements[index])>1e-8)){
    restoreReplacements();
    rollbackWaterSources();
    root.remove(water);
    disposeReplacementOutputs();waterGeometry.dispose();waterMaterial.dispose();
    root.updateMatrixWorld(true);
    throw Error('park pond65: unified water transform compensation');
  }
  for(const entry of prepared){
    const invariant=entry.mesh.geometry===entry.oldGeometry&&
      entry.mesh.matrix.equals(entry.oldMatrix)&&
      entry.mesh.matrixWorld.equals(entry.oldMatrixWorld)&&
      entry.mesh.visible===entry.oldVisible;
    if(!invariant){
      restoreReplacements();
      rollbackWaterSources();
      root.remove(water);
      disposeReplacementOutputs();waterGeometry.dispose();waterMaterial.dispose();
      root.updateMatrixWorld(true);
      throw Error('park pond65: collision invariant '+entry.mesh.name);
    }
  }
  for(const entry of replacements){
    const invariant=entry.mesh.geometry===entry.nextGeometry&&
      entry.mesh.material===entry.oldMaterial&&
      entry.mesh.matrix.equals(entry.oldMatrix)&&
      entry.mesh.matrixWorld.equals(entry.oldMatrixWorld)&&
      entry.mesh.visible===entry.oldVisible&&
      entry.mesh.parent===entry.oldParent;
    if(!invariant){
      restoreReplacements();
      rollbackWaterSources();
      root.remove(water);
      disposeReplacementOutputs();waterGeometry.dispose();waterMaterial.dispose();
      root.updateMatrixWorld(true);
      throw Error('park pond65: replacement invariant '+entry.mesh.name);
    }
  }
  for(const replacement of replacements){
    let shared=false;
    root.traverse(object=>{if(object.isMesh&&object.geometry===replacement.oldGeometry)shared=true;});
    if(!shared)replacement.oldGeometry.dispose();
  }
  const report={
    version:65,revision:'P8',variant:meta.variant,patchId:meta.patchId,
    westPathGapMetres:0,walkWidthMetres:4.5,orphanSliverRemoved:true,
    upperBridgeVisibleCorePathOverlapSquareMetres:0,
    lowerBridgeVisibleCorePathOverlapSquareMetres:0,
    bridgeAxialHiddenOverlapMetres:0.03,
    bridgeApproachesContinuous:true,waterSurfaceUnified:true,
    roadUnderBothBridgeDecksRemoved:true,
    roadBridgeClipSameMesh:true,
    roadBridgeClipCollision:true,
    roadBridgeAxialHiddenOverlapMetres:.03,
    upperPondRoadCurbShoulder:true,
    upperPondRoadWallTrianglesRemoved:178,
    upperPondRoadShoulderTriangles:178,
    upperPondRoadHiddenClosureTriangles:178,
    upperPondRoadEndpointCapTriangles:2,
    upperPondRoadShoulderCollision:true,
    upperPondRoadShoulderSameRoadMesh:true,
    upperPondRoadShoulderClosedWedge:true,
    upperPondRoadShoulderOpenBoundaryEdges:0,
    upperPondRoadShoulderNonmanifoldEdges:0,
    upperPondRoadShoulderOrientationConflictEdges:0,
    upperPondRoadCurbPairedSegmentsRepaired:89,
    upperPondRoadCurbTailSegmentsCoveredByPathShoulder:35,
    lowerNeckRoadCurbShoulder:true,
    lowerNeckRoadWallTrianglesRemoved:12,
    lowerNeckRoadShoulderTriangles:12,
    lowerNeckRoadHiddenClosureTriangles:12,
    lowerNeckRoadEndpointCapTriangles:2,
    lowerNeckRoadShoulderCollision:true,
    lowerNeckRoadShoulderSameRoadMesh:true,
    lowerNeckRoadShoulderClosedWedge:true,
    lowerNeckRoadShoulderOpenBoundaryEdges:0,
    lowerNeckRoadShoulderNonmanifoldEdges:0,
    lowerNeckRoadCurbPairedSegmentsRepaired:6,
    lowerNeckClosureAndCapNormalsPastelSmoothed:true,
    lowerNeckPastelHiddenClosureVertices:14,
    lowerNeckPastelEndpointCapVertices:6,
    lowerNeckPastelMinimumNormalY:.96,
    lowerNeckPastelNormalOnlyGeometryUnchanged:true,
    upperPondInternalWallTrianglesRemoved:74,
    upperPondSeamCapTriangles:52,
    upperPondSeamCapCollision:true,
    upperPondSeamAddedDrawCalls:0,
    upperPondPathCurbShoulder:true,
    upperPondPathWallTrianglesRemoved:70,
    upperPondShoulderTriangles:70,
    upperPondHiddenClosureTriangles:70,
    upperPondEndpointCapTriangles:2,
    upperPondShoulderCollision:true,
    upperPondShoulderSamePathMesh:true,
    upperPondShoulderClosedWedge:true,
    upperPondShoulderOpenBoundaryEdges:0,
    upperPondShoulderNonmanifoldEdges:0,
    upperPondOpposedPathCurbWallPairsRemaining:0,
    upperPondShoulderMaximumHiddenClosureGapMetres:pathItem.shoulder.maximumHiddenLowerClosureSeparationMetres,
    externalWaterFacingCurbGeometryPreserved:true,
    externalWaterFacingCurbNormalsPreserved:false,
    upperPondWaterFacingCurbNormalsPastelSmoothed:true,
    upperPondWaterFacingCurbSmoothedFaces:1048,
    upperPondWaterFacingCurbAdjustedNormals:667,
    upperPondWaterFacingCurbMinimumNormalY:.96,
    upperPondWaterFacingCurbTriangleCoverageChanged:false,
    upperPondWaterFacingCurbCollisionChanged:false,
    lowerNeckWaterFacingCurbNormalsPastelSmoothed:true,
    lowerNeckWaterFacingCurbSmoothedFaces:198,
    lowerNeckWaterFacingCurbAdjustedNormals:537,
    cumulativeWaterFacingCurbSmoothedFaces:1246,
    cumulativeWaterFacingCurbAdjustedNormals:1204,
    dryShoreVisualWaterOverlapSquareMetres:0,
    dryShoreCollisionWaterOverlapSquareMetres:0,
    dryShoreSameMeshReplacement:true,
    hiddenLegacyMaterials:3,geometryReplacements:5,
    addedMeshes:1,addedDrawCalls:1,waterCollision:false,
  };
  root.userData.parkPond65=report;
  return report;
}
