//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 //prevents re-entrancy attacks
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarket is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds; //total number of items ever created
    Counters.Counter private _itemsSold; //total number of items sold

    address tokenAddress = address(0);
    address marketowner; //owner of the smart contract
    //people have to pay to puy their NFT on this marketplace
    uint256 listingPrice = 0;

    enum State { Created, Sold, Deleted }

    constructor(address tokenAddr){
        marketowner = msg.sender;
        tokenAddress = tokenAddr;
    }

    struct MarketItem {
        uint itemId;
        address nftContract;
        uint256 tokenId;
        address seller; //person selling the nft
        address owner; //owner of the nft
        uint256 price;
        State state;
    }

    //a way to access values of the MarketItem struct above by passing an integer ID
    mapping(uint256 => MarketItem) private idMarketItem;

    //log message (when Item is sold)
    event MarketItemCreated (
        uint indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address  seller,
        address  owner,
        uint256 price,
        State state
    );

    /// @notice function to get listingprice
    function getListingPrice() public view returns (uint256){
        return listingPrice;
    }

    /// @notice function to create market item
    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price) public nonReentrant{

         require(price > 0, "Price must be above zero");
         require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "must be the owner");
         require(IERC20(tokenAddress).balanceOf(msg.sender) >= listingPrice , "Insuficent funds for listing");

         IERC20(tokenAddress).transferFrom(msg.sender, marketowner, listingPrice);

         _itemIds.increment(); //add 1 to the total number of items ever created
         uint256 itemId = _itemIds.current();

         idMarketItem[itemId] = MarketItem(
             itemId,
             nftContract,
             tokenId,
             msg.sender, //address of the seller putting the nft up for sale
             address(0), //no owner yet (set owner to empty address)
             price,
             State.Created
         );
            require(IERC721(nftContract).getApproved(tokenId) == address(this), "NFT must be approved to market");
            //transfer ownership of the nft to the contract itself
            IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

            //log this transaction
            emit MarketItemCreated(
                itemId,
             nftContract,
             tokenId,
             msg.sender,
             address(0),
             price,
             State.Created);

        }

  function deleteMarketItem(uint256 itemId) public nonReentrant {
    require(itemId <= _itemIds.current(), "id must <= item count");
    require(idMarketItem[itemId].state == State.Created, "item must be on market");
    MarketItem storage item = idMarketItem[itemId];

    require(idMarketItem[itemId].seller == msg.sender, "must be the owner");
    //require(IERC721(item.nftContract).getApproved(item.tokenId) == address(this), "NFT must be approved to market");

    IERC721(item.nftContract).transferFrom(address(this), item.seller, item.tokenId);

    item.itemId = 0;
    item.nftContract = address(0);
    item.price = 0;
    item.tokenId = 0;
    item.state = State.Deleted;
  }


        /// @notice function to create a sale
  function createMarketSale(
      address nftContract,
      uint256 itemId
      ) public nonReentrant{
        
          uint price = idMarketItem[itemId].price;
          uint tokenId = idMarketItem[itemId].tokenId;

           require(IERC20(tokenAddress).balanceOf(msg.sender) >= price, "Please submit the asking price");
           //require(IERC721(nftContract).getApproved(tokenId) == address(this), "NFT must be approved to market");

             //transfer ownership of the nft from the contract itself to the buyer
            IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
            IERC20(tokenAddress).transferFrom(msg.sender, idMarketItem[itemId].seller, price);

            idMarketItem[itemId].owner = msg.sender; //mark buyer as new owner
            idMarketItem[itemId].state = State.Sold; //mark that it has been sold
            _itemsSold.increment(); //increment the total number of Items sold by 1
        }


        /// @notice total number of items unsold on our platform
        function fetchMarketItems() public view returns (MarketItem[] memory){
            uint itemCount = _itemIds.current(); //total number of items ever created
            //total number of items that are unsold = total items ever created - total items ever sold
            uint unsoldItemCount = _itemIds.current() - _itemsSold.current();
            uint currentIndex = 0;

            MarketItem[] memory items =  new MarketItem[](unsoldItemCount);

            //loop through all items ever created
            for(uint i = 0; i < itemCount; i++){

                //get only unsold item
                //check if the item has not been sold
                //by checking if the owner field is empty
                if(idMarketItem[i+1].state == State.Created){
                    //yes, this item has never been sold
                    uint currentId = idMarketItem[i + 1].itemId;
                    MarketItem storage currentItem = idMarketItem[currentId];
                    items[currentIndex] = currentItem;
                    currentIndex += 1;

                }
            }
            return items; //return array of all unsold items
        }

        /// @notice fetch list of NFTS owned/bought by this user
        function fetchMyNFTs() public view returns (MarketItem[] memory){
            //get total number of items ever created
            uint totalItemCount = _itemIds.current();

            uint itemCount = 0;
            uint currentIndex = 0;


            for(uint i = 0; i < totalItemCount; i++){
                //get only the items that this user has bought/is the owner
                if(idMarketItem[i+1].owner == msg.sender){
                    itemCount += 1; //total length
                }
            }

            MarketItem[] memory items = new MarketItem[](itemCount);
            for(uint i = 0; i < totalItemCount; i++){
               if(idMarketItem[i+1].owner == msg.sender){
                   uint currentId = idMarketItem[i+1].itemId;
                   MarketItem storage currentItem = idMarketItem[currentId];
                   items[currentIndex] = currentItem;
                   currentIndex += 1;
               }
            }
            return items;

        }


         /// @notice fetch list of NFTS owned/bought by this user
        function fetchItemsCreated() public view returns (MarketItem[] memory){
            //get total number of items ever created
            uint totalItemCount = _itemIds.current();

            uint itemCount = 0;
            uint currentIndex = 0;


            for(uint i = 0; i < totalItemCount; i++){
                //get only the items that this user has bought/is the owner
                if(idMarketItem[i+1].seller == msg.sender){
                    itemCount += 1; //total length
                }
            }

            MarketItem[] memory items = new MarketItem[](itemCount);
            for(uint i = 0; i < totalItemCount; i++){
               if(idMarketItem[i+1].seller == msg.sender){
                   uint currentId = idMarketItem[i+1].itemId;
                   MarketItem storage currentItem = idMarketItem[currentId];
                   items[currentIndex] = currentItem;
                   currentIndex += 1;
               }
            }
            return items;

        }

    function setListingFee(uint fee) public onlyOwner {
        require(fee >= 0, "fee cannot be less than 0");
        listingPrice = fee;
    }

    function setTokenAddress(address tokenAddr) public onlyOwner {
        require(tokenAddr != address(0), "The new address cannot be address 0");
        tokenAddress = tokenAddr;
    }


}