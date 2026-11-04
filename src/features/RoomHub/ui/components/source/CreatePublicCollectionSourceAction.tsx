import LibraryAddRounded from "@mui/icons-material/LibraryAddRounded";
import "./sourceNavigation.css";

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
      className="hub-source-create"
    >
      <LibraryAddRounded aria-hidden="true" />
      <span><strong>建立公開題庫</strong><small>讓大家一起猜你的歌</small></span>
    </button>
  );
};

export default CreatePublicCollectionSourceAction;
