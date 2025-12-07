export const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export function getRoomId(idA, idB) {
  if (!idA || !idB) return null;
  const a = String(idA);
  const b = String(idB);
  return a > b ? `${a}-${b}` : `${b}-${a}`;
}
