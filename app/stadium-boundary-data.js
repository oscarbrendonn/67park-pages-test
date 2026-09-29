// The stadium hole in the approved 6_BORDUR top surface, in world metres.
// Baked from both Island exports after curb-joins retopology: identical rings.
// The 1 cm close/open removes export noise; 2 mm simplification retains the
// north-east chamfer. The inset stadium rectangle is NOT the parcel boundary.
export const stadiumBoundary=Object.freeze([
 [200.73110,-76.66978],[200.73844,-76.66657],
 [201.24640,-76.11794],[201.79530,-75.60972],[201.79851,-75.60238],
 [201.79851,12.00497],[201.79558,12.01204],[201.78851,12.01497],
 [114.99516,12.01497],[114.98809,12.01204],[114.98516,12.00497],
 [114.98516,-76.65978],[114.98809,-76.66685],[114.99516,-76.66978],
].map(p=>Object.freeze(p)));
export const stadiumPavingBounds=Object.freeze({west:114.98516,east:201.79851,north:-76.66978,south:12.01497});
