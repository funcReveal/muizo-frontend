const TermsPage: React.FC = () => (
  <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--mc-border)] bg-[var(--mc-surface)]/80 p-6 text-[var(--mc-text)] shadow-[0_20px_60px_-40px_rgba(2,6,23,0.8)]">
    <h2 className="text-2xl font-semibold text-[var(--mc-text)]">服務條款</h2>
    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--mc-text-muted)]">
      最後更新：2026/02/28
    </p>
    <p className="mt-4 text-sm text-[var(--mc-text-muted)]">
      使用本服務（Muizo）即表示你已閱讀、理解並同意本條款與隱私權政策。若你不同意，請停止使用本服務。
    </p>

    <div className="mt-6 space-y-5 text-sm">
      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">1. 服務內容</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          本服務提供音樂競猜、房間互動、播放清單同步與收藏庫管理等功能。服務內容可能隨產品調整而新增、修改或下架。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">2. 帳號與登入</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>你需使用 Google OAuth 或電子郵件帳號登入後才能遊玩。</li>
          <li>若使用 Google 登入，亦須遵守 Google 的相關條款與政策。</li>
          <li>你應自行維護裝置與帳號安全，避免未授權存取。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">3. Google API 與 YouTube 相關條款</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>本服務使用 Google OAuth 與 YouTube API 僅提供你要求的功能。</li>
          <li>你可隨時於 Google 帳戶權限頁面撤銷本服務授權。</li>
          <li>YouTube 內容之權利歸原權利人或平台所有，你應自行確認使用合法性。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">4. 使用者行為規範</h3>
        <ul className="mt-2 space-y-2 text-[var(--mc-text-muted)]">
          <li>不得從事違法、侵權、詐欺、騷擾或其他不當行為。</li>
          <li>不得干擾、攻擊、逆向、爬取或破壞本服務與相關系統。</li>
          <li>不得冒用他人身分或未經授權蒐集他人資料。</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">5. 內容與智慧財產</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          本服務介面、程式與設計受相關智慧財產權保護。你透過第三方平台匯入或連結的內容，其權利仍歸原權利人所有。你應確保提供與使用內容不侵害他人權利。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">6. 服務可用性與中斷</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          我們將盡力維持服務穩定，但不保證服務永不中斷、無錯誤或完全符合你的特定需求。因維護、升級、第三方服務異常或不可抗力造成中斷時，我們會在合理範圍內處理。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">7. 責任限制</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          在適用法律允許範圍內，本服務對因使用或無法使用本服務所生之間接、附帶或衍生性損害不負責。若依法不得排除責任，責任範圍以法律規定為準。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">8. 終止與停權</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          若你違反本條款或有濫用、攻擊、重大風險行為，我們得在必要時限制或終止你使用全部或部分功能。
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-[var(--mc-text)]">9. 條款更新與聯絡</h3>
        <p className="mt-2 text-[var(--mc-text-muted)]">
          我們可能不定期更新本條款，更新後版本將公布於本頁。若你持續使用本服務，視為同意更新後條款。聯絡信箱：funcreveal@gmail.com。
        </p>
      </section>
    </div>
  </div>
);

export default TermsPage;
