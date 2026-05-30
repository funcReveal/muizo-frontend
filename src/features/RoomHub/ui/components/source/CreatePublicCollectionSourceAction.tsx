import LibraryAddRounded from "@mui/icons-material/LibraryAddRounded";

type CreatePublicCollectionSourceActionProps = {
  onClick: () => void;
  isAuthenticated?: boolean;
};

const CreatePublicCollectionSourceAction = ({
  onClick,
}: CreatePublicCollectionSourceActionProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full cursor-pointer rounded-2xl border border-dashed border-cyan-300/28 bg-cyan-300/8 px-3 py-3 text-left transition hover:border-cyan-300/48 hover:bg-cyan-300/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-100 transition group-hover:scale-105">
          <LibraryAddRounded sx={{ fontSize: 19 }} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--mc-text)]">
            建立公開收藏庫
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--mc-text-muted)]">
            讓其他玩家也能用你的題庫開房。
          </p>
        </div>
      </div>
    </button>
  );
};

export default CreatePublicCollectionSourceAction;
