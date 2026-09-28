import FolderClient from '@/components/resources/FolderClient';

export default function FolderPage(props: any) {
  const id = props?.params?.id;
  return <FolderClient folderId={id} />;
}
