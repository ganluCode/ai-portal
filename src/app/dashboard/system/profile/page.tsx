export default function Page() {
  return (
    <div className='flex flex-1 flex-col gap-4 p-6'>
      <div>
        <h1 className='text-2xl font-semibold'>个人设置</h1>
        <p className='text-muted-foreground mt-1 text-sm'>管理个人信息和偏好</p>
      </div>
      <div className='border-muted flex flex-1 items-center justify-center rounded-lg border border-dashed'>
        <p className='text-muted-foreground text-sm'>开发中...</p>
      </div>
    </div>
  );
}
