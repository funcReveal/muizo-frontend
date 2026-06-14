const PrivacyPage: React.FC = () => (
  <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-6 text-[var(--mc-text)] shadow-[0_20px_60px_-40px_rgba(2,6,23,0.8)]">
    <h2 className="text-2xl font-semibold text-[var(--mc-text)]">隱私權政策</h2>
    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--mc-text-muted)]">
      最後更新：2026/06/14
    </p>
    <p className="mt-4 text-sm text-[var(--mc-text-muted)]">
      歡迎使用本服務（Muizo）。我們重視你的隱私與個人資料保護，以下說明我們如何蒐集、使用、保護與刪除資料。若你對本政策有任何問題，請聯絡：
      funcreveal@gmail.com。
    </p>

    <div className="mt-6 space-y-5 text-sm">
      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">1. 蒐集的資料類型</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>帳號與識別資料：Google OAuth 登入後的名稱、電子郵件、頭像、Google 帳號識別碼。</li>
          <li>YouTube 相關資料：你主動同步的播放清單資訊與其公開可見的歌曲中繼資料。</li>
          <li>遊戲與使用資料：房間名稱、收藏庫操作、基本錯誤紀錄與服務診斷資訊。</li>
          <li>個人化資料：你在引導流程提供的性別、出生日期（用於計算年齡）、感興趣的題庫分類。</li>
          <li>驗證資訊：為維持登入狀態所需的短期憑證與工作階段資料。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">2. 資料使用目的</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>提供登入、身分驗證與帳號管理功能。</li>
          <li>提供 YouTube 播放清單同步、收藏庫管理與建立題庫功能。</li>
          <li>提供房間遊戲、連線同步與問題排查。</li>
          <li>依你的性別、年齡與興趣，推薦合適的題庫與內容。</li>
          <li>提升服務穩定性與安全性（如偵錯、濫用防護）。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">3. 個人化推薦與商業分析（選擇性同意）</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          若你在引導流程中<b>主動勾選同意</b>，我們會將你直接提供的人口統計與興趣資料（性別、年齡、感興趣的分類）以及遊戲使用數據，以<b>彙總或去識別</b>的形式用於內容分析與商業合作。
        </p>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>此同意為<b>選擇性</b>，預設為關閉；不同意不會影響你正常使用本服務。</li>
          <li>你可隨時於「設定 → 帳號與隱私」開啟或關閉此同意。</li>
          <li>此商業用途<b>不包含</b>透過 Google 登入或 YouTube API 取得的資料；該等資料依第 4 節規範，不出售、不用於廣告。</li>
          <li>未滿 13 歲的帳號不適用此項。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">4. Google 使用者資料與 API 使用聲明</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          本服務使用 Google OAuth 與 YouTube API。Google 使用者資料僅用於本服務向你明確提供的功能，不會出售、不會用於廣告投放、不會用於建立廣告受眾。除非法律要求或你明確授權，我們不會將 Google 使用者資料提供給無關第三方。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">5. 敏感資料保護機制</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>傳輸加密：網站與 API 連線採用 HTTPS/TLS。</li>
          <li>存取控制：僅授權人員可基於最小權限原則存取必要資料。</li>
          <li>憑證管理：敏感金鑰與憑證儲存於受保護的環境變數或祕密管理機制，不寫入前端程式碼庫。</li>
          <li>工作階段安全：登入狀態使用 HttpOnly Cookie 與短效存取憑證維持，並限制憑證有效期限。</li>
          <li>權杖保護：Refresh Token 僅以雜湊值形式儲存於伺服器端資料庫；Google OAuth Token 僅在後端服務保存與更新，不回傳至一般前端使用者資料查詢。</li>
          <li>日誌與監控：保留必要的安全與錯誤紀錄，用於偵測異常與資安事件調查。</li>
          <li>事件應變：若發生重大資安事件，將依適用法律進行處理與通知。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">6. 資料保存期限與刪除</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>我們僅在提供服務所需期間保存資料。</li>
          <li>你可以要求刪除帳號或相關資料，我們會在合理期間內處理。</li>
          <li>依法必須保存的資料將在法定期間內保存，期滿後刪除或去識別化。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">7. 第三方服務與跨境處理</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          本服務可能使用第三方雲端基礎設施或託管服務。資料可能因服務部署而在不同地區處理。我們會要求合作服務商提供合理安全防護，並僅在提供服務必要範圍內處理資料。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">8. 你的權利</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>查詢、更正或要求刪除你的個人資料。</li>
          <li>隨時於「設定 → 帳號與隱私」撤回商業分析同意。</li>
          <li>隨時取消 Google 授權（可於 Google 帳戶權限頁面撤銷）。</li>
          <li>停止使用本服務；停止後可申請刪除資料。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">9. 兒童與未成年人</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          本服務不以未滿 13 歲兒童為對象。若你是未成年人，請在法定代理人同意下使用本服務。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">10. 政策更新與聯絡方式</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          我們可能因法規或服務調整更新本政策，更新後將公布於本頁。若有問題，請來信
          funcreveal@gmail.com。
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPage;
