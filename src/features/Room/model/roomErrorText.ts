export const translateRoomErrorDetail = (
  detail: string | null | undefined,
): string => {
  const normalized = (detail ?? "").trim();
  if (!normalized) return detail ?? "";

  const temporaryBanMatch = normalized.match(
    /^You are temporarily banned(?: \((\d+)s\))?$/i,
  );
  if (temporaryBanMatch) {
    const remainingSec = temporaryBanMatch[1];
    return remainingSec
      ? `你目前遭暫時封鎖（剩餘 ${remainingSec} 秒）`
      : "你目前遭暫時封鎖";
  }

  if (
    /^You are permanently banned$/i.test(normalized) ||
    /^You have been permanently banned by the host\.?$/i.test(normalized)
  ) {
    return "你已被房主永久封鎖";
  }

  if (/^You are banned$/i.test(normalized)) {
    return "你目前已被封鎖";
  }

  if (
    /^You have been kicked and banned(?: from this room)?\.?$/i.test(normalized)
  ) {
    return "你已被踢出房間並封鎖";
  }

  if (
    /^You have been removed from the room by the host\.?$/i.test(normalized) ||
    /^You have been removed from this room by the host\.?$/i.test(normalized)
  ) {
    return "你已被房主移出房間";
  }

  if (/^You have been kicked(?: from this room)?\.?$/i.test(normalized)) {
    return "你已被踢出房間";
  }

  if (/^Missing room session token$/i.test(normalized)) {
    return "缺少房間恢復憑證，請重新加入房間";
  }

  if (/^Room session expired$/i.test(normalized)) {
    return "房間恢復憑證已過期，請重新加入房間";
  }

  if (/^Invalid room session payload$/i.test(normalized)) {
    return "房間恢復資料異常，請重新加入房間";
  }

  if (/^Invalid room session$/i.test(normalized)) {
    return "房間恢復失敗，請重新加入房間";
  }

  if (/^Session not found in room$/i.test(normalized)) {
    return "此房間中的玩家連線資料已不存在，請重新加入房間";
  }

  if (/^Room not found$/i.test(normalized)) {
    return "找不到房間，可能房間已關閉";
  }

  if (/^You are already in another room$/i.test(normalized)) {
    return "你目前已在另一個房間中";
  }

  if (/^Room is busy\. Please retry\.$/i.test(normalized)) {
    return "房間忙碌中，請稍後再試";
  }

  return normalized;
};
