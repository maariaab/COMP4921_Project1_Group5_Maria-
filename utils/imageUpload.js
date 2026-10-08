const cloudinary =
    include("config/cloudinary");


function uploadImage(buffer) {

    return new Promise(
        (resolve, reject) => {

            const uploadStream =
                cloudinary.uploader.upload_stream(
                    {
                        folder:
                            "content-hub"
                    },
                    (
                        error,
                        result
                    ) => {

                        if (error) {

                            return reject(
                                error
                            );

                        }


                        resolve({
                            publicId:
                                result.public_id,

                            imageUrl:
                                result.secure_url
                        });

                    }
                );


            uploadStream.end(
                buffer
            );

        }
    );

}

async function deleteImage(
    publicId
) {

    try {

        await cloudinary.uploader.destroy(
            publicId
        );

    }
    catch (err) {

        console.error(
            "Unable to clean up Cloudinary image:",
            err
        );

    }

}


module.exports = {
    uploadImage,
    deleteImage,
};