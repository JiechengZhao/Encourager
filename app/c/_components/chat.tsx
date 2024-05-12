type Prop = { message: string };
type IconPron = {fColor: string, bgColor: string, text: string, alt: string}
function Icon({ fColor, bgColor, text, alt}: IconPron) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center mr-2 shrink-0">
      <img
        src={`https://placehold.co/200x/${bgColor}/${fColor}.svg?text=${text}&font=Lato`}
        alt={alt}
        className="w-8 h-8 rounded-full"
      />
    </div>
  );
}

export function OutgoingMessage({ message }: Prop) {
  return (
    <div className="flex mb-4 cursor-pointer">
      <Icon fColor="ffffff" bgColor="b7a8ff" text="ʕ•́ᴥ•̀ʔ" alt="My Avatar"/>
      <div className="flex bg-indigo-500 text-white rounded-lg p-3 gap-3">
        <p>{message}</p>
      </div>
    </div>
  );
}

export function IncomingMessage({ message }: Prop) {
  return (
    <div className="flex mb-4 cursor-pointer">
      <Icon fColor="ffffff" bgColor="b7a8ff" text="ʕ•́ᴥ•̀ʔ" alt="My Avatar"/>
      <div className="flex bg-white rounded-lg p-3 gap-3">
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}

export default IncomingMessage;
