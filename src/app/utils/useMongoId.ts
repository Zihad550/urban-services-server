import { ObjectId } from "mongodb";

const useMongoId = (value: string) => {
  return new ObjectId(value);
};

export default useMongoId;
