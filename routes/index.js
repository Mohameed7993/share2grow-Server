
const express = require('express');
const router = express.Router();
const { verifyIdToken } = require('firebase-admin/auth'); // Make sure Firebase Admin SDK is set up

const { getDocs,setDoc,collection,deleteDoc,getDoc, Timestamp,updateDoc,arrayUnion ,query,doc, where, } = require('firebase/firestore');
const { signInWithEmailAndPassword,createUserWithEmailAndPassword, signOut } = require('firebase/auth'); // Import Firebase Authentication functions
const { db, auth,storage } = require('../firbase'); // Import Firestore and Auth instances

const admin = require('firebase-admin');
const path = require('path');

// Path to the service account file
const serviceAccount = path.join(__dirname, '../share2g-f8466-firebase-adminsdk-gp6k0-17252ae42a.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Now you can proceed with your logic




// Route to fetch all users
router.get('/getAllBusinessOwners', async (req, res) => {
    try {
      console.log('Fetching business owners...');
      
      // Create a query to fetch users with role == 5
      const q = query(collection(db, 'managers'), where('role', '==', 5));
      const usersSnapshot = await getDocs(q);
  
      console.log('Query executed successfully.');
  
      if (usersSnapshot.empty) {
        console.log('No users found.');
        return res.status(404).json({ message: 'No users found' }); // Return JSON response
      }
  
      // Map through documents and format the response
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      
  
      // Send the users data as a JSON response
      res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  router.post('/getAllBusinesses', async (req, res) => {
    const { currentUserUid } = req.body;
    console.log(req.body)
    try {
      console.log('Fetching business...');
      
      // Create a query to fetch users with role == 5
      const q = query(collection(db, 'businesses'), where('managerId', '==', currentUserUid));
      const usersSnapshot = await getDocs(q);
  
      console.log('Query executed successfully.');
  
      if (usersSnapshot.empty) {
        console.log('No Businesses found.');
        return res.status(404).json({ message: 'No Businesses found' }); // Return JSON response
      }
  
      // Map through documents and format the response
      const Businesses = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      
  
      // Send the users data as a JSON response
      res.status(200).json(Businesses);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });



router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log("email: "+email+ ","+"pass:"+ password)
  
    try {
      // Firebase Authentication sign-in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
      // Get the user's UID and ID token
      const uid = userCredential.user.uid;
      const idToken = await userCredential.user.getIdToken();
    
      // Initialize variables for user details and collection name
      let userDetails = null;
     
    
      // Attempt to fetch the user's role from the 'managers' collection
      const managerDoc = await getDoc(doc(db, "managers", uid));
      if (managerDoc.exists()) {
        userDetails = managerDoc.data();
        
      } else {
        // If not found in 'managers', check the 'users' collection
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          userDetails = userDoc.data();
         
        }
      }
    
      // If the user was not found in either collection, return a 404 response
      if (!userDetails) {
        return res.status(404).json({ message: "User not found" });
      }
    
      // Return the user details, ID token, and UID to the frontend
      res.status(200).json({ userDetails, idToken, uid});
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ message: "Invalid email or password" });
    }
    
  });


  router.post('/logout', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1]; // Get the token from the Authorization header
  
      if (!token) {
        return res.status(400).json({ message: 'Token is required for logout' });
      }
  
      // Correct method to verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(token); 
      console.log('User logged out:', decodedToken.uid);
  
      // Perform any additional logic for logging out the user (e.g., invalidating sessions)
  
      // Send a success response
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(400).json({ message: 'Invalid token or logout failed' });
    }
  });



  router.post('/AddNewBussinessOwner', async (req, res) => {
    const { fullname, id, email, phoneNumber, role, businessNumber } = req.body;
    const status="activated";

    // Validate required fields
    if (!fullname || !id || !email || !phoneNumber) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const signup =await createUserWithEmailAndPassword(auth,email,id);
    if(signup){
    try {
        const { uid } = signup.user;
        // Reference to the "Users" collection, but directly using doc() method
        const userDocRef = doc(db, "managers", uid); // Use 'id' as the document ID
        const userDoc = await getDoc(userDocRef);  // Fetch the document

        // Check if the user document already exists
        if (userDoc.exists()) {
            return res.status(400).json({ message: 'Error, User ID is already taken.' });
        }

        // If the document does not exist, proceed to create the new business owner
        await setDoc(userDocRef, {
            fullname,
            email,
            phoneNumber,
            role,
            businessNumber,
            status,
            id,
        });

        return res.status(201).json({ success: true, message: 'Business owner added successfully' });
    } catch (error) {
        console.error('Error adding business owner:', error);  // Log the error
        return res.status(500).json({ message: 'Internal server error' });
    }
}else{
    return res.status(400).json({ message: 'Error, Email is already in Use...' });
  }
});

router.put('/updateUserStatus', async (req, res) => {
    const { email, status } = req.body;
    console.log(email)

    // Validate input
    if (!email || !status) {
        return res.status(400).json({ message: 'Email and Status are required' });
    }

    try {
        console.log(`Finding user with email: ${email} to update status to: ${status}`);

        // Query Firestore to find the user by email
        const q = query(collection(db, 'managers'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('No user found with the provided email.');
            return res.status(404).json({ message: 'User not found with the provided email' });
        }

        // Get the user document's UID (assuming only one match)
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;

        console.log(`User found with ID: ${userId}. Proceeding to update status.`);

        // Reference to the user document
        const userDocRef = doc(db, 'managers', userId);

        // Update the 'status' field
        await updateDoc(userDocRef, { status });

        console.log(`User status updated successfully for user ID: ${userId}`);

        // Send a success response
        res.status(200).json({ message: `User status updated to "${status}" for email "${email}"` });
    } catch (error) {
        console.error('Error updating user status:', error);

        // Handle Firestore-specific errors
        if (error.code === 'not-found') {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.put('/updateBusinessStatus', async (req, res) => {
    const { businessName, status } = req.body;

    // Validate input
    if (!businessName || !status) {
        return res.status(400).json({ message: 'Business name and status are required' });
    }

    try {
        console.log(`Updating status for business with name: ${businessName}`);

        // Query Firestore to find the business document
        const q = query(collection(db, 'businesses'), where('businessName', '==', businessName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('No business found with the provided name.');
            return res.status(404).json({ message: 'Business not found with the provided name' });
        }

        // Get the business document's ID (assuming only one match)
        const businessDoc = querySnapshot.docs[0];
        const businessId = businessDoc.id;

        console.log(`Business found with ID: ${businessId}. Proceeding to update status.`);

        // Reference to the business document
        const businessDocRef = doc(db, 'businesses', businessId);

        // Update the 'status' field
        await updateDoc(businessDocRef, { status });

        console.log(`Business status updated successfully for business ID: ${businessId}`);

        // Send a success response
        res.status(200).json({ message: `Business status updated to "${status}" for name "${businessName}"` });
    } catch (error) {
        console.error('Error updating business status:', error);

        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});



router.post('/AddNewBusiness', async (req, res) => {
    const { businessName, location, linkForBusinessWebsite, managerId, campaignsNumber, totalJoinedUsers,email,phonenumber } = req.body;
    const campaignCount = 0;
    const totalShares = 0;
    const status='Activated';

    // Validate required fields
    if (!businessName || !location || !linkForBusinessWebsite || !managerId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the managerId exists in Firestore (manager user must exist)
       
            // Check if the managerId exists in Firestore (manager user must exist)
            const managerDoc = await getDoc(doc(db, 'managers', managerId));
        
            if (!managerDoc.exists()) {
                return res.status(404).json({ message: 'Manager not found' });
            } else {
                // Get a reference to the manager document
                const managerDocRef = doc(db, 'managers', managerId);
        
                // Retrieve the current businessNumber from the document
                const managerData = managerDoc.data();
                let currentBusinessNumber = managerData.businessNumber || 0; // Default to 0 if undefined
        
                // Increment the businessNumber
                const updatedBusinessNumber = currentBusinessNumber + 1;
        
                // Update the manager document with the incremented businessNumber
                await updateDoc(managerDocRef, { businessNumber: updatedBusinessNumber });
        
                console.log(`Manager's businessNumber updated to ${updatedBusinessNumber}`);
            }
      

        // Check if the business with the same name already exists (optional)
        const q = query(collection(db, 'businesses'), where('businessName', '==', businessName));
        const existingBusinessSnapshot = await getDocs(q);
        if (!existingBusinessSnapshot.empty) {
            return res.status(400).json({ message: 'Business with this name already exists' });
        }

        // Firestore will auto-generate the document ID when adding the new business
        const newBusinessRef = doc(collection(db, 'businesses')); // Firestore generates the document ID here

        // Create the business document with the generated ID
        await setDoc(newBusinessRef, {
            businessName,
            location,
            linkForBusinessWebsite,
            managerId,
            campaignsNumber,
            totalJoinedUsers,
            status,
            email,
            phonenumber,
        });

        // Now that we have the new business ID, use it to create a document in the businessStats collection
        const newBusinessStatsRef = doc(collection(db, 'businessStats'), newBusinessRef.id); // Use the ID of the new business document
        await setDoc(newBusinessStatsRef, {
            campaignCount,
            totalShares,
        });

        // Send success response
        res.status(201).json({ success: true, message: 'Business added successfully' });
    } catch (error) {
        console.error('Error adding business:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.post('/Business-dashboard-data', async (req, res) => {
  const { currentUserUid } = req.body;
  console.log(currentUserUid);

  // Check if currentUserUid is provided
  if (!currentUserUid) {
    return res.status(400).json({ message: 'currentUserUid is required.' });
  }

  try {
    // Fetch campaigns data
    const campaignsQuery = query(collection(db, 'campaigns'));
    const campaignsSnapshot = await getDocs(campaignsQuery);

    console.log('Campaigns query executed successfully.');

    if (campaignsSnapshot.empty) {
      console.log('No campaigns found.');
      return res.status(404).json({ message: 'No campaigns found' });
    }

    // Fetch business data for the specific managerId
    const businessQuery = query(collection(db, 'businesses'), where('managerId', '==', currentUserUid));
    const businessSnapshot = await getDocs(businessQuery);

    console.log('Business query executed successfully.');

    if (businessSnapshot.empty) {
      console.log('No businesses found.');
      return res.status(404).json({ message: 'No businesses found' });
    }

    // Mapping documents to return in response
    const businesses = businessSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const campaigns = campaignsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Send success response with data
    res.status(200).json({
      message: 'Fetching Business Dashboard data successfully!',
      campaigns: campaigns,
      businesses: businesses,
    });

  } catch (error) {
    console.error('Error fetching Business Dashboard data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/addNewCampaign', async (req, res) => {
    const {
        businessId,
        campaignName,
        description,
        joinedUsers,
        totalShares,
        sourceLink,
        status,
        createdAt,
        tags,
        campaignType,
        campaignId // Add this field if you're specifying the ID
    } = req.body;

    if (
        !businessId ||
        !campaignName ||
        !description ||
        typeof joinedUsers !== 'number' ||
        typeof totalShares !== 'number' ||
        !sourceLink ||
        !status ||
        !createdAt ||
        !tags ||
        !campaignType ||
        typeof campaignType.shares !== 'number' ||
        typeof campaignType.value !== 'number' ||
        !campaignType.type
    ) {
        return res.status(400).json({ message: 'Invalid campaign data.' });
    }

    try {
        console.log('Adding new campaign...');

        const newCampaign = {
            businessId,
            campaignName,
            description,
            joinedUsers,
            totalShares,
            sourceLink,
            status,
            createdAt: new Date(createdAt),
            tags: tags.split(',').map(tag => tag.trim()),
            campaignType,
        };

        // Generate or use a specific campaign ID
        const campaignDocId = campaignId || `campaign_${businessId}_${Date.now()}`;

        // Reference a specific document in the 'campaigns' collection
        const campaignDocRef = doc(db, 'campaigns', campaignDocId);

        // Save campaign to Firestore
        await setDoc(campaignDocRef, newCampaign);

        console.log(`Campaign added with ID: ${campaignDocId}`);
        res.status(201).json({ message: 'Campaign created successfully!', campaignId: campaignDocId });
    } catch (error) {
        console.error('Error adding campaign:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/getAllCampaigns', async (req, res) => {
    try {

      console.log('Fetching Campaigns...');
      
      
      const q = query(collection(db, 'campaigns'));
      const campaignsSnapshot = await getDocs(q);
  
      console.log('Query executed successfully.');
  
      if (campaignsSnapshot.empty) {
        console.log('No campaigns found.');
        return res.status(404).json({ message: 'No campaigns found' }); // Return JSON response
      }
  
      // Map through documents and format the response
      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // Send the users data as a JSON response
      res.status(200).json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  router.delete("/deleteCampaign/:campaignId", async (req, res) => {
    const { campaignId } = req.params;

    console.log("Received Campaign ID:", campaignId);

    if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
    }

    try {
        const campaignDocRef = doc(db, 'campaigns', campaignId);
        const campaignSnapshot = await getDoc(campaignDocRef);

        if (!campaignSnapshot.exists) {
            return res.status(404).json({ error: "Campaign not found" });
        }

        await deleteDoc(campaignDocRef);

        return res.status(200).json({ message: "Campaign deleted successfully!" });
    } catch (error) {
        console.error("Error deleting campaign:", error);
        return res.status(500).json({ error: "An error occurred while deleting the campaign" });
    }
});
router.delete("/deleteBusiness/:businessId", async (req, res) => {
    const { businessId } = req.params;

    console.log("Received Business ID:", businessId);

    if (!businessId) {
        return res.status(400).json({ error: "Business ID is required" });
    }

    try {
        const businessDocRef = doc(db, 'businesses', businessId);
        const businessSnapshot = await getDoc(businessDocRef);

        if (!businessSnapshot.exists) {
            return res.status(404).json({ error: "Business not found" });
        }

        await deleteDoc(businessDocRef);

        return res.status(200).json({ message: "Business deleted successfully!" });
    } catch (error) {
        console.error("Error deleting business:", error);
        return res.status(500).json({ error: "An error occurred while deleting the business" });
    }
});

router.post("/facebook-login", async (req, res) => {
  const { accessToken, userID } = req.body;

  console.log("AccessToken:", accessToken);
  console.log("UserID:", userID);

  try {
    // Step 1: Fetch user details from Facebook
    const fbResponse = await fetch(
      `https://graph.facebook.com/${userID}?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const fbData = await fbResponse.json();

    if (fbData.error) {
      return res.status(400).json({
        message: "Error fetching Facebook data",
        error: fbData.error,
      });
    }

    console.log("Facebook Data:", fbData);

    // Step 2: Check if a user document with the given facebookID exists
    const usersCollection = collection(db, "users");
    const userQuery = query(usersCollection, where("facebookID", "==", userID));
    const querySnapshot = await getDocs(userQuery);

    if (!querySnapshot.empty) {
      // User exists
      const existingUser = querySnapshot.docs[0].data();

      console.log("User found in Firestore:", existingUser);

      return res.status(200).json({
        message: "User found successfully",
        user: {
          created: 0, // User already exists
          id: userID,
          user_id: existingUser.userId || userID,
          name: existingUser.name,
          role: existingUser.role || 1,
          email: existingUser.email || "No email provided",
          profilePicture: existingUser.profilePicture || "",
        },
      });
    } else {
      console.log("User document does not exist. Creating a new one...");

      // Step 3: Create a new user with userID as the document ID
      const userDocRef = doc(usersCollection, userID); // Reference the document with userID as the ID
      const newUser = {
        facebookID: userID,
        role: 1, // Default role
        name: fbData.name || "Unknown",
        email: fbData.email || "No email provided",
        profilePicture: fbData.picture?.data?.url || "",
      };

      await setDoc(userDocRef, newUser); // Set the document with the specified ID

      console.log("New user created in Firestore:", newUser);

      return res.status(200).json({
        message: "User created successfully",
        user: {
          created: 1, // User was newly created
          id: userID,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
          profilePicture: newUser.profilePicture,
        },
      });
    }
  } catch (error) {
    console.error("Error during Facebook login:", error);
    return res.status(500).json({ message: "Server error during Facebook login" });
  }
});


router.post('/create-user', async (req, res) => {
  const { email, userId, FUID } = req.body;  // Extracting email, userId, and FUID from the request body

  if (!email || !userId || !FUID) {
      return res.status(400).json({ message: 'Email, User ID, and FUID are required' });
  }

  try {

      // Step 1: Create the Firebase user with email and userId
      const userCredential = await createUserWithEmailAndPassword(auth, email, userId);
      const uid = userCredential.user.uid;  // Get the UID of the newly created user

      // Step 2: Fetch the existing document using the FUID
      const oldDocRef = doc(db, 'users', FUID);
      const oldDoc = await getDoc(oldDocRef);

      if (oldDoc.exists()) {
          const oldData = oldDoc.data();  // Get the data from the old document

          // Step 3: Create a new document in Firestore using the new UID
          const newDocRef = doc(db, 'users', uid);

          // Step 4: Add the email and user ID to the copied data
          const newUserData = {
              ...oldData,   // Copy all fields from the old document
              email: email,  // Add the email
              userId: userId  // Add the userId
          };

          // Step 5: Save the new document to Firestore
          await setDoc(newDocRef, newUserData);
          
          // Step 6: Delete the old document from Firestore
          await deleteDoc(oldDocRef); // Delete the document with ID FUID

          return res.status(201).json({
              success: true,
              message: 'User created and data copied successfully',
              userUid: uid,  // Return the UID of the newly created user
              email:email,
              userId:userId,
          });
      } else {
          return res.status(404).json({ message: 'FUID document not found' });
      }
  } catch (error) {
      console.error('Error creating user or copying data:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
});



// Fetch active campaigns with the status "activated"
router.get("/campaigns", async (req, res) => {
  try {
    const q = query(collection(db, "campaigns"), where("status", "==", "Activated"));
    const campaignsSnapshot = await getDocs(q); // Using getDocs to execute the query

    if (campaignsSnapshot.empty) {
      return res.status(404).json({ message: "No active campaigns found" });
    }

    const campaigns = [];
    campaignsSnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res.status(500).json({ error: "An error occurred while fetching campaigns" });
  }
});

// Join a campaign (add user to the participants list)
router.post("/campaigns/join", async (req, res) => {
  const { campaignId, userId } = req.body; // Assuming userId is passed when joining a campaign

  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Campaign ID and User ID are required" });
  }

  try {
    // Get the campaign document reference
    const campaignRef = doc(db, "campaigns", campaignId);
    const campaignSnapshot = await getDoc(campaignRef);

    if (!campaignSnapshot.exists()) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const campaignData = campaignSnapshot.data();
    const updatedParticipants = campaignData.participants || [];
    updatedParticipants.push(userId); // Add the userId to the participants array

    // Update the campaign document with the new participants list
    await campaignRef.update({
      participants: updatedParticipants,
    });

    return res.status(200).json({ message: "Successfully joined the campaign!" });
  } catch (error) {
    console.error("Error joining campaign:", error);
    return res.status(500).json({ error: "An error occurred while joining the campaign" });
  }
});


router.post('/campaigns/joinCampaign', async (req, res) => {
  try {
    const { userId, campaignId } = req.body; // Expecting userId and campaignId to be sent in request body

    // Validate input
    if (!userId || !campaignId) {
      return res.status(400).json({ success: false, message: 'userId and campaignId are required' });
    }

    // Step 1: Fetch the campaign details from Firestore
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignDoc = await getDoc(campaignRef);

    if (!campaignDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const campaignData = campaignDoc.data();
    
    // Log the campaign data for debugging
    console.log('Campaign Data:', campaignData);

    // Step 2: Generate the referral link for the user
    const sublink = `${campaignData.sourceLink}/${campaignId}/referral/${userId}`;

    // Step 3: Get the current date and initialize shares
    const joinedDate = new Date().toISOString();
    const collectedShares = 0; // Initial value
    const allShares = campaignData.campaignType.shares || 0; // Ensure 'shares' exists, otherwise default to 0

    // Step 4: Check if the sourceLink exists, if not, default to an empty string
    const sourceLink = campaignData.sourceLink || ''; 

    // Step 5: Add the campaign to the user's 'joinedCampaigns' array in Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = userDoc.data();

    // Step 6: Store campaign join details
    const joinedCampaignDetails = {
      campaignName:campaignData.campaignName,
      campaignId: campaignId,
      joinedDate: joinedDate,
      collectedShares: collectedShares,
      allShares: allShares,
      sublinks: sublink,
      sourceLink: sourceLink, // Ensure sourceLink is not undefined
    };

    // Log the joinedCampaignDetails for debugging
    console.log('Joined Campaign Details:', joinedCampaignDetails);

    // Update user's 'joinedCampaigns' array in Firestore
    await updateDoc(userRef, {
      joinedCampaigns: arrayUnion(joinedCampaignDetails),  // Use arrayUnion here
    });

    // Step 7: Respond with success
    res.status(200).json({ success: true, message: 'Successfully joined the campaign' });

  } catch (error) {
    console.error("Error joining campaign:", error);
    res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
});

router.post("/user/joinedCampaigns", async (req, res) => {
  const { userId } = req.body; // Extract userId from the request body

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const joinedCampaigns = userDoc.data().joinedCampaigns || [];
    res.status(200).json({ success: true, campaigns: joinedCampaigns });
  } catch (error) {
    console.error("Error fetching joined campaigns:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/campaign/details", async (req, res) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ success: false, message: "Campaign ID is required" });
    }

    // Fetch campaign details using modular syntax
    const campaignRef = doc(db, "campaigns", campaignId); // Reference to the document
    const campaignSnap = await getDoc(campaignRef);

    if (!campaignSnap.exists()) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const campaign = { id: campaignSnap.id, ...campaignSnap.data() };

    res.status(200).json({ success: true, campaign });
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/getWalletDetails", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = userSnap.data();
    const wallet = userData.wallet || { cash: [], discount: [] };

    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.get('/track', async (req, res) => {
  // Get the query parameters: sourceUrl, campaignId, userId
  console.log("start tracking")
  console.log(req.query);
  const { sourceUrl, campaignId, userId } = req.query;

  if (!sourceUrl || !campaignId || !userId) {
    return res.status(400).send("Missing required parameters");
  }
  console.log(req.headers)

  // Get the visitor's IP address
  // const userIp =req.headers['true-client-ip'] || req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // // Log the IP and other details
  // console.log('Campaign ID:', campaignId);
  // console.log('User ID:', userId);
  // console.log('Visitor IP Address:', userIp);
  // console.log('Source URL:', sourceUrl);

  res.send({
    message: 'Parameters received and IP logged successfully',
    campaignId,
    userId,
    sourceUrl,
  });
});

module.exports = router;