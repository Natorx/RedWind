/* @Date:2026.5.27

 */
type PageBoxProps = {
  children: React.ReactNode;
};
const PageBox: React.FC<PageBoxProps> = ({ children }) => {
  return (
    <div className="h-screen bg-gradient-to-br from-red-950 to-neutral-900">
      {children}
    </div>
  );
};
export default PageBox;
